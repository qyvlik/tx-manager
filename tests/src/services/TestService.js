import {txManager, mapperFactory} from "../config/database.js";

export default class TestService {
    constructor() {
        this.__mapper = mapperFactory.create({namespace: `TestMapper`});
    }

    async createTableIfNotExist() {
        return await txManager.runTransaction(async () => {
            const [result] = await this.__mapper.createTableIfNotExist();
            return result;
        });
    }



    /**
     *
     * @param key       {string}
     * @return {Promise<number>}
     */
    async getByKey(key) {
        return await txManager.runQuery(async () => {
            const [rows] = await this.__mapper.getByKey({key});
            return txManager.getSelectOneRecord(rows);
        });
    }

    /**
     *
     * @param key       {string}
     * @return {Promise<number>}
     */
    async save(key) {
        return await txManager.runTransaction(async () => {
            const [{insertId}] = await this.__mapper.save({key});
            return insertId;
        });
    }

    /**
     *
     * @param keyList       {[string]}
     * @return {Promise<[number]>}
     */
    async batchSave(keyList) {
        return await txManager.runTransaction(async () => {
            const [result] = await this.__mapper.batchSave({list: keyList});
            return txManager.getBatchInsertIdList(result);
        });
    }

    /**
     *
     * @param id       {number}
     * @return {Promise<number>}
     */
    async deleteById(id) {
        return await txManager.runTransaction(async () => {
            const [{affectedRows}] = await this.__mapper.deleteById({id});
            return affectedRows > 0;
        });
    }

}