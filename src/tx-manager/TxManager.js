import {AsyncLocalStorage} from "async_hooks";

function range(begin, end) {
    if (begin > end) {
        return [];
    }
    if (begin === end) {
        return [begin];
    }

    const array = [];

    while (begin <= end) {
        array.push(begin);
        begin += 1;
    }

    return array;
}

export default class TxManager {

    constructor({pool}) {
        this.__pool = pool;
        this.__als = new AsyncLocalStorage();
        this.__connectionId = 0;
        this.__applyCount = 0;
        this.__closeCount = 0;
    }

    async getContext() {
        let store = this.__als.getStore();
        if (typeof store === 'undefined') {
            const connection = await this.__pool.getConnection();
            this.__applyCount++;
            this.__connectionId++;
            store = {
                id: this.__connectionId,
                count: 0,
                connection
            };
        } else {
            store.count++;
        }
        return store;
    }

    async close() {
        if (this.__closeCount !== this.__applyCount) {
            console.error(`applyCount=${this.__applyCount}, closeCount=${this.__closeCount}`);
        }

        await this.__pool.end()
    }

    getExistConnection() {
        const store = this.__als.getStore();
        if (typeof store !== 'undefined') {
            return store.connection;
        }
        return null;
    }

    /**
     *
     * @return {null|number}
     */
    getExistConnectionId() {
        const store = this.__als.getStore();
        if (typeof store !== 'undefined') {
            return store.id;
        }
        return null;
    }

    async runTransaction(cb) {
        const store = await this.getContext();

        this.__als.enterWith(store);

        const {id, count, connection} = this.__als.getStore();
        if (count === 0) {
            await connection.beginTransaction();
        }

        try {
            const result = await cb(connection, id);
            if (count === 0) {
                await connection.commit();
            }
            return result;
        } catch (error) {
            if (count === 0) {
                await connection.rollback();
            }
            throw error;
        } finally {
            if (count <= 0) {
                this.__closeCount++;

                // you can use connection.unprepare
                await connection.release();
            } else {
                store.count--;
            }
        }
    }

    async runQuery(cb) {
        const store = await this.getContext();
        this.__als.enterWith(store);

        const {id, count, connection} = this.__als.getStore();
        try {
            return await cb(connection, id);
        } finally {
            if (count <= 0) {
                this.__closeCount++;
                // you can use connection.unprepare
                await connection.release();
            } else {
                store.count--;
            }
        }
    }

    /**
     * info like `Records: 42  Duplicates: 0  Warnings: 0`
     * @param result   {
     *     fieldCount: number,
     *     affectedRows: number,
     *     insertId: number,
     *     info: string,
     *     serverStatus: number,
     *     warningStatus: number
     * }
     * @return {[number]}
     */
    getBatchInsertIdList(result) {
        const {
            fieldCount,
            affectedRows,
            insertId,
            info,
            serverStatus,
            warningStatus
        } = result;
        return range(insertId, insertId + parseInt(affectedRows) - 1);
    }

    /**
     *
     * @param rows          {[any]}
     * @param mapperSqlId   {string}
     * @return {any|null}
     */
    getSelectOneRecord(rows, mapperSqlId = '') {
        return rows.length !== 0 ? rows[0] : null;
    }
}
