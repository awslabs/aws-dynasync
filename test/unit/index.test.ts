import { Match, Template } from 'aws-cdk-lib/assertions';
import { Dynasync } from '../../src'; 
import { App, Stack } from 'aws-cdk-lib';
import { join } from 'path';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import {tables} from '../tables.json';
import { writeFileSync } from 'fs';
import { SchemaTable, SchemaTableInstance } from '../../src/types';
import { definition } from '../schema';
import { pathToJson, passedTypes } from '../data';
import { DbTable } from '../../src/db/table';

let app:App,
    stack:Stack,
    userPool: UserPool,
    template: Template;

describe('Dynasync', () => {
    beforeEach(() => {
        app = new App();
        stack = new Stack(app, "TestStack");
        userPool = new UserPool(stack, "UserPool", {
            userPoolName: 'SyncPool'
        });
    });

    it('Creates default construct', () => {
        new Dynasync(stack, 'DynasyncConstruct', {
            userPool,
            configFile: pathToJson
        });
        template = Template.fromStack(stack);
        template.resourceCountIs("AWS::AppSync::GraphQLApi", 1);
        template.hasResourceProperties("AWS::AppSync::GraphQLApi", {
            UserPoolConfig: Match.objectLike({DefaultAction:"ALLOW"})
        });
    });

    it('Creates construct with userPoolDeny', () => {
        new Dynasync(stack, 'DynasyncConstruct', {
            userPool,
            configFile: pathToJson,
            userPoolDeny: true
        });
        template = Template.fromStack(stack);
        writeFileSync(join(process.cwd(), 'test.json'), JSON.stringify(template,null,'\t'));
        template.hasResourceProperties("AWS::AppSync::GraphQLApi", {
            UserPoolConfig: Match.objectLike({DefaultAction:"DENY"})
        });
    });

    it('Throws when configFile does not exist', () => {
        const fakePath = join(__dirname, 'tablets.json');
        expect(() => {
            new Dynasync(stack, 'DynasyncConstruct', {
                userPool,
                configFile: fakePath
            });
            Template.fromStack(stack)
        }).toThrowError(`Config file ${fakePath} does not exist`);
    });

    it('Throws when configFile is wrong type', () => {
        const fakePath = join(__dirname, '..', 'schema.ts');
        expect(() => {
            new Dynasync(stack, 'DynasyncConstruct', {
                userPool,
                configFile: fakePath
            });
            Template.fromStack(stack)
        }).toThrowError(`File at ${fakePath} is not JSON file`);
    });

    it('Accepts table arguments outside of config file', () => {
        new Dynasync(stack, 'DynasyncConstruct', {
            userPool,
            tables: tables as unknown as SchemaTable[]
        });
        template = Template.fromStack(stack);
        template.resourceCountIs("AWS::AppSync::GraphQLApi", 1);
    });

    it('Works when passing DbTable', () => {
        new Dynasync(stack, 'DynasyncConstruct', {
            userPool,
            tables: [
                new DbTable(stack, {
                    tableName: "Fish",
                    partitionKey: "fishId",
                    auto: true,
                    attributes: {
                        "fishId": "ID!",
                        "age": "Int!",
                        "name": "String",
                        "description": "String"
                    }
                }
            )]
        });
        template = Template.fromStack(stack);
        template.resourceCountIs("AWS::AppSync::GraphQLApi", 1);
    });
});

describe('CloudFormation Template', () => {
    beforeEach(() => {
        app = new App();
        stack = new Stack(app, "TestStack");
        userPool = new UserPool(stack, "UserPool", {
            userPoolName: 'SyncPool'
        });
        new Dynasync(stack, 'DynasyncConstruct', {
            userPool,
            configFile: pathToJson,
            ...passedTypes
        });
        template = Template.fromStack(stack);
    });
    
    it('Adds user pool', () => {
        template.hasResourceProperties("AWS::Cognito::UserPool", {
            UserPoolName: 'SyncPool'
        });
    });

    it('Adds DB Tables', () => {
        template.resourceCountIs("AWS::DynamoDB::Table", 4);
        template.hasResourceProperties("AWS::DynamoDB::Table", {
            AttributeDefinitions: Match.arrayWith([
                {
                    "AttributeName": "dogId",
                    "AttributeType": "S"
                }
            ]),
            GlobalSecondaryIndexes: Match.arrayWith([
                Match.objectLike({
                    IndexName: 'globalDogName'
                })
            ])
        });
    });

    it('Adds schema definition', () => {
        template.hasResourceProperties("AWS::AppSync::GraphQLSchema", {
            Definition: definition
        });
    });

});