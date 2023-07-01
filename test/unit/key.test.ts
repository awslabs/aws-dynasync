import { KeyInstance } from '../../src/key/instance';
import { SyncType } from '../../src/key/sync-type';
import { SchemaGlobalIndex } from '../../src/key/global';
import { AttributeType, ProjectionType } from 'aws-cdk-lib/aws-dynamodb';
import { SchemaPrimaryKey } from '../../src/key/primary';


    describe('Keys', () => {
        it("Generates Key Instance", () => {
            const key = new KeyInstance("MyKey", 'String!');
            expect(key.name).toBe('MyKey');
            expect(key.templateType).toEqual({"MyKey": "string"});
            expect(key.objectType).toEqual({"MyKey": "String!"});
            const key2 = new KeyInstance(key);
            expect(key2.name).toBe('MyKey');
            expect(key2.templateType).toEqual({"MyKey": "string"});
            expect(key2.objectType).toEqual({"MyKey": "String!"});
        });

        it("Key Instance converts attribute name", () => {
            const key = new KeyInstance("MyKey", 'String!');
            expect(key.convertAttributeName('binary')).toBe(AttributeType.BINARY);
            expect(key.convertAttributeName('number')).toBe(AttributeType.NUMBER);
            expect(key.convertAttributeName('anythingelse')).toBe(AttributeType.STRING);
        });

        it("Generates Key Instance with SyncType passed", () => {
            const key = new KeyInstance("MyKey", new SyncType("MyKey", "String!"));
            expect(key.name).toBe('MyKey');
            expect(key.templateType).toEqual({"MyKey": "string"});
            expect(key.objectType).toEqual({"MyKey": "String!"});
        });

        it("Generates Key Instance with Projection", () => {
            const index = new KeyInstance("MyKey", 'String!');
            const key = new SchemaGlobalIndex("MyFirstGlobalIndex", index);
            expect(key.projectionType).toBeUndefined();
            expect(key.nonKeyAttributes).toBeUndefined();
            const key2 = new SchemaGlobalIndex("MyGlobalIndex", index, undefined, false, ['keyonly']);
            expect(key2.projectionType).toEqual(ProjectionType.KEYS_ONLY);
            expect(key2.nonKeyAttributes).toBeUndefined();
            const key3 = new SchemaGlobalIndex("MyOtherGlobalIndex", index, undefined, false, ['include']);
            expect(key3.projectionType).toEqual(ProjectionType.INCLUDE);
            expect(key3.nonKeyAttributes).toEqual(['include']);
        });

        it("Primary key returns partition and sort key names", () => {
            const key = new SchemaPrimaryKey('MyKey', "MySortKey");
            expect(key.pName).toBe('MyKey');
            expect(key.sName).toBe('MySortKey');
        });

        it("Sync Type works as expected", () => {
            const type = new SyncType("MyKey", "String!");
            expect(type.isList).toBeFalsy();
            expect(type.isRequired).toBeTruthy();
            expect(type.isRequiredList).toBeFalsy();
            const type2 = new SyncType("MyKey", "[String]!");
            expect(type2.isList).toBeTruthy();
            expect(type2.isRequired).toBeFalsy();
            expect(type2.isRequiredList).toBeTruthy();
            const type3 = new SyncType("MyKey", "[String!]!");
            expect(type3.isList).toBeTruthy();
            expect(type3.isRequired).toBeTruthy();
            expect(type3.isRequiredList).toBeTruthy();
            const type4 = new SyncType("MyKey", "[String]");
            expect(type4.isList).toBeTruthy();
            expect(type4.isRequired).toBeFalsy();
            expect(type4.isRequiredList).toBeFalsy();
            expect(type4.getBaseOptions()).toEqual({
                isList: true,
                isRequired: false,
                isRequiredList: false
            });
        });

        it("Sync Type converts to typescript type", () => {
            const type = new SyncType("MyKey", "String!");
            expect(type.toTypescriptType()).toBe('string');
            const type2 = new SyncType("MyKey", "[String]");
            expect(type2.toTypescriptType()).toBe('string[]');
            const type3 = new SyncType("MyKey", "MyType");
            expect(type3.toTypescriptType()).toBe('Record<string,any>');
        });

        it("Sync Type returns correct dynamo attribute", () => {
            const type = new SyncType("MyKey", "String!");
            expect(type.toDynamoAttribute()).toBe('S');
            const type2 = new SyncType("MyKey", "Int");
            expect(type2.toDynamoAttribute()).toBe('N');
            const type3 = new SyncType("MyKey", "Boolean");
            expect(type3.toDynamoAttribute()).toBe('B');
        });

    });