import MybatisMapper from "mybatis-mapper";

export default class Mapper {
    /**
     *
     * @param xmlFile       {string}
     * @param namespace     {string}
     * @param verbose       {boolean}
     * @param txManager     {TxManager}
     * @param slowSqlTime   {number}
     */
    constructor({xmlFile, namespace, verbose = false, txManager, slowSqlTime}) {
        this.verbose = verbose;
        MybatisMapper.createMapper([xmlFile]);
        const sqlIds = MybatisMapper.getMapper()[namespace];
        const that = this;
        for (const sqlId of Object.keys(sqlIds)) {
            this[sqlId] = async (params) => {
                const connection = await txManager.getExistConnection();
                if (connection === null) {
                    throw new Error(`${namespace}.${sqlId} : connection not exist, please TxManager.runQuery or TxManager.runTransaction}`)
                }
                const format = {language: 'mysql', indent: '  '};
                const sql = MybatisMapper.getStatement(namespace, sqlId, params, format);
                const beginTime = Date.now();
                // connection.execute will increase max_prepared_stmt_count
                const result = await connection.query(sql);
                const endTime = Date.now();
                if (that.verbose) {
                    const type = (endTime - beginTime) > slowSqlTime ? 'slow-sql' : 'sql';
                    console.debug(`${type}=${sql}, result=${JSON.stringify(result[0])}`);
                }
                return result;
            }
        }
    }
}
