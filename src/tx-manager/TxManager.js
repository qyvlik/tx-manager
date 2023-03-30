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

    async __getOrCreateContext() {
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
            console.error(`TxManager applyCount:${this.__applyCount} != closeCount:${this.__closeCount}`);
        }
        await this.__pool.end()
    }

    /**
     *
     * @return {{connection: any|null, id: number|null, count: number|null}}
     */
    getCurrentContext() {
        const store = this.__als.getStore();
        if (typeof store !== 'undefined') {
            return store;
        }
        return {connection: null, id: null, count: null};
    }

    /**
     * @callback TransactionCallback
     * @param connection
     * @param id            {number}    connection id
     */
    /**
     * Start a Transaction
     * @param cb    {TransactionCallback}
     * @return {Promise<unknown>}
     */
    async runTransaction(cb) {
        const store = await this.__getOrCreateContext();
        return new Promise((resolve, reject) => {
            this.__als.run(store, async () => {
                const {id, count, connection} = this.__als.getStore();
                try {
                    if (count === 0) {
                        await connection.beginTransaction();
                    }

                    const result = await cb(connection, id);
                    if (count === 0) {
                        await connection.commit();
                    }
                    resolve(result);
                } catch (error) {
                    if (count === 0) {
                        await connection.rollback();
                    }
                    reject(error);
                } finally {
                    if (count <= 0) {
                        this.__closeCount++;
                        await connection.release();
                    } else {
                        store.count--;
                    }
                }
            });
        });
    }

    /**
     * @callback QueueCallback
     * @param connection
     * @param id            {number}    connection id
     */
    /**
     * Start a Queue
     * @param cb    {QueueCallback}
     * @return {Promise<unknown>}
     */
    async runQuery(cb) {
        const store = await this.__getOrCreateContext();
        return new Promise((resolve, reject) => {
            this.__als.run(store, async () => {
                const {id, count, connection} = this.__als.getStore();
                try {
                    const result = await cb(connection, id);
                    resolve(result);
                } catch (error) {
                    reject(error);
                } finally {
                    if (count <= 0) {
                        this.__closeCount++;
                        await connection.release();
                    } else {
                        store.count--;
                    }
                }
            })
        });
    }

    /**
     * info like `Records: 42  Duplicates: 0  Warnings: 0`
     * @param result   {{
     *     fieldCount: number,
     *     affectedRows: number,
     *     insertId: number,
     *     info: string,
     *     serverStatus: number,
     *     warningStatus: number
     * }}
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
