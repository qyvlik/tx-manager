import mysql from 'mysql2/promise';
import path from "path"

import TxManager from "../../../src/tx-manager/TxManager.js";
import MapperFactory from "../../../src/tx-manager/MapperFactory.js";

const host = process.env['MYSQL_HOST'];
const port = parseInt(process.env['MYSQL_PORT']);
const user = process.env['MYSQL_USER'];
const password = process.env['MYSQL_PASSWORD'];
const database = process.env['MYSQL_DATABASE'];

const pool = await mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const txManager = new TxManager({pool});

const __dirname = path.resolve();
const mapperXmlFilePath = __dirname + '/tests/resources/mapper/';
const slowSqlTime = 1000;

const mapperFactory = new MapperFactory({
    txManager,
    mapperXmlFilePath,
    slowSqlTime
});



export {
    txManager,
    mapperFactory
};