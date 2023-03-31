# tx-manager

通过 [mysql2](https://github.com/sidorares/node-mysql2) 和 [mybatis-mapper](https://github.com/OldBlackJoe/mybatis-mapper) 提供近似 Spring-Boot + MyBatis 的 CRUD 研发体验。

```bash
npm install @c10k/tx-manager
```

## Mapper.xml 的声明和使用

参考如下文件

1. [tests/resources/mapper/TestMapper.xml](./tests/resources/mapper/TestMapper.xml)
2. [tests/src/services/TestService.js](./tests/src/services/TestService.js)
    - 包含了 Dao、Mapper、Service 的概念
3. [tests/src/config/database.js](./tests/src/config/database.js)
   - 类似于 Spring-Boot 中的 Bean 对象

## 使用 MySQL 事务

如下代码表示如何开启一个事务，在嵌套的回调中，使用的事务也是同一个，满足了大部分的开发场景。

```js
const uuid1 = uuidv4();
const uuid2 = uuidv4();
await txManager.runTransaction(async (_, connectionId1) => {
    const id1 = await testService.save(uuid1);

    await txManager.runTransaction(async (_, connectionId2) => {
        const id2 = await testService.save(uuid2);

        expect(connectionId1).toBe(connectionId2);

        const {id: connectionId3} = txManager.getCurrentContext();

        expect(connectionId1).toBe(connectionId3);

        throw new Error(`rollback by error`);
    });
});
```