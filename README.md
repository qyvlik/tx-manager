# tx-manager

Provides CRUD development experience similar to Spring-Boot + MyBatis using [mysql2](https://github.com/sidorares/node-mysql2) and [mybatis-mapper](https://github.com/OldBlackJoe/mybatis-mapper).

```bash
npm install @c10k/tx-manager
```

## Declaration and Usage of Mapper.xml

Refer to the following files:

1. [tests/resources/mapper/TestMapper.xml](./tests/resources/mapper/TestMapper.xml)
2. [tests/src/services/TestService.js](./tests/src/services/TestService.js)
    - Contains the concepts of Dao, Mapper, and Service.
3. [tests/src/config/database.js](./tests/src/config/database.js)
   - Similar to Bean objects in Spring-Boot

## Using MySQL Transactions

The following code demonstrates how to start a transaction, and use the same transaction in nested callbacks, satisfying most development scenarios.

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