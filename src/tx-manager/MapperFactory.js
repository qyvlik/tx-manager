
import Mapper from "./Mapper.js";

export default class MapperFactory {
    /**
     *
     * @param txManager             {TxManager}
     * @param mapperXmlFilePath     {string}
     * @param slowSqlTime           {number}
     */
    constructor({txManager, mapperXmlFilePath,slowSqlTime = 1000 }) {
        this.__txManager = txManager;
        this.__mapperXmlFilePath = mapperXmlFilePath;
        this.__slowSqlTime = slowSqlTime;
    }

    /**
     *
     * @param namespace
     * @param verbose
     * @return {Mapper}
     */
    create({namespace, verbose = false}) {
        const xmlFile = `${this.__mapperXmlFilePath}/${namespace}.xml`;
        return new Mapper({
            xmlFile,
            namespace,
            verbose,
            txManager: this.__txManager,
            slowSqlTime: this.__slowSqlTime
        });
    }
}
