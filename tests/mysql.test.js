import {v4 as uuidv4} from 'uuid';

import {txManager} from "./src/config/database.js";

import TestService from "./src/services/TestService.js";

const testService = new TestService();

test('test create table', async () => {
    {
        const connectionId = txManager.getExistConnectionId();
        expect(connectionId).toBeNull();
    }

    const result = await testService.createTableIfNotExist();
    expect(txManager.__applyCount).toBe(txManager.__closeCount);

    {
        const connectionId = txManager.getExistConnectionId();
        expect(connectionId).toBeNull();
    }
});

test('test save data and get and delete', async () => {
    {
        const connectionId = txManager.getExistConnectionId();
        expect(connectionId).toBeNull();
    }

    const uuid = uuidv4();
    const id = await testService.save(uuid);
    expect(txManager.__applyCount).toBe(txManager.__closeCount);

    const entity = await testService.getByKey(uuid);
    expect(txManager.__applyCount).toBe(txManager.__closeCount);
    expect(entity.id).toBe(id);
    expect(entity.key).toBe(uuid);

    const result1 = await testService.deleteById(id);
    expect(txManager.__applyCount).toBe(txManager.__closeCount);
    expect(result1).toBe(true);

    const result2 = await testService.deleteById(id);
    expect(txManager.__applyCount).toBe(txManager.__closeCount);
    expect(result2).toBe(false);

    const entity2 = await testService.getByKey(uuid);
    expect(txManager.__applyCount).toBe(txManager.__closeCount);
    expect(entity2).toBeNull();

    {
        const connectionId = txManager.getExistConnectionId();
        expect(connectionId).toBeNull();
    }
});


test('test batch save', async () => {
    let index = 10;
    const keyList = [];
    while (index-- > 0) {
        keyList.push(uuidv4());
    }

    const idList = await testService.batchSave(keyList);
    expect(txManager.__applyCount).toBe(txManager.__closeCount);
    for (const id of idList) {
        const result1 = await testService.deleteById(id);
        expect(txManager.__applyCount).toBe(txManager.__closeCount);
        expect(result1).toBe(true);

        const result2 = await testService.deleteById(id);
        expect(txManager.__applyCount).toBe(txManager.__closeCount);
        expect(result2).toBe(false);
    }
});

test('test nest call with same mysql transaction', async () => {

    const uuid1 = uuidv4();
    const uuid2 = uuidv4();

    try {
        await txManager.runTransaction(async (_, connectionId1) => {
            const id1 = await testService.save(uuid1);

            await txManager.runTransaction(async (_, connectionId2) => {
                const id2 = await testService.save(uuid2);

                expect(connectionId1).toBe(connectionId2);

                console.debug(`connectionId1=${connectionId1} == connectionId2=${connectionId2}`);

                throw new Error(`rollback by error`);
            });
        });
        expect(false).toBe(true);
    } catch (error) {
        expect(error.message).toBe(`rollback by error`);
    }

    const entity1 = await testService.getByKey(uuid1);
    expect(entity1).toBeNull();

    const entity2 = await testService.getByKey(uuid2);
    expect(entity2).toBeNull();
});

test('test nest call with same mysql transaction', async () => {
    await testService.dropTable();
});

afterAll(async () => {
    expect(txManager.__applyCount).toBe(txManager.__closeCount);
    await txManager.close();
    expect(txManager.__applyCount).toBe(txManager.__closeCount);
});
