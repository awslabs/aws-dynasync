import { Match, Template } from 'aws-cdk-lib/assertions';
import { Dynasync } from '../../src'; 
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { pathToJson, passedTypes } from '../data';
import { App, Stack } from 'aws-cdk-lib';
import { DbTable } from '../../src/db/table';
import { AppSyncStack } from '../../src/api';
import { BillingMode } from 'aws-cdk-lib/aws-dynamodb';

let app:App,
    stack:Stack,
    userPool: UserPool,
    template: Template;


    describe('AppSyncApi', () => {
        beforeEach(() => {
            app = new App();
            stack = new Stack(app, "TestStack");
        });

        it('Merges config file and arguments', () => {
            const sync = new Dynasync(stack, 'DynasyncConstruct', {
                userPool,
                configFile: pathToJson,
                ...passedTypes
            });
            template = Template.fromStack(stack);
            expect(Object.keys(sync.props.types?.enums || []).length).toBe(3);
            const def = sync.appsync.schema.root.getDefinition(sync.appsync.api)
            expect(def).toContain('union DogAndCat = Dog | Cat');
            expect(def).toContain('interface MyInterface');
        });

        it('Gets user pool', () => {
            const sync = new Dynasync(stack, 'DynasyncConstruct', {
                userPool,
                configFile: pathToJson,
                ...passedTypes
            });
            template = Template.fromStack(stack);
            expect(sync.appsync.userPool).toBeInstanceOf(UserPool);
        });

        it('Throws when no partition key in attributes', () => {
            const sync = new Dynasync(stack, 'DynasyncConstruct', {
                userPool,
                configFile: pathToJson,
                ...passedTypes
            });
            expect(() => {
                sync.appsync.validateTable(new DbTable(stack, {
                        "tableName": "Fish",
                        "partitionKey": "fishId",
                        "auto": true,
                        "attributes": {
                            "type": "String!",
                            "age": "Int!",
                            "name": "String",
                            "description": "String"
                        }
                    }
                ));
            }).toThrowError(`Partition Key fishId must be present in attributes`)
        });

        it('Throws when no sort key in attributes', () => {
                const sync = new Dynasync(stack, 'DynasyncConstruct', {
                    userPool,
                    configFile: pathToJson,
                    ...passedTypes
                });
                expect(() => {
                    sync.appsync.validateTable(new DbTable(stack, {
                            "tableName": "Fish",
                            "partitionKey": "fishId",
                            "sortKey": "type",
                            "auto": true,
                            "attributes": {
                                "fishId": "ID!",
                                "age": "Int!",
                                "name": "String",
                                "description": "String"
                            }
                        }
                    ));
            }).toThrowError(`Sort Key type must be present in attributes`)
        });

        it('Throws when array is passed and type is neither union nor enum', () => {
            expect(() => {
                new Dynasync(stack, 'DynasyncConstruct', {
                    userPool,
                    configFile: pathToJson,
                    types: {
                        // @ts-ignore
                        interfaces: {
                            // @ts-ignore
                            MyInterface:['Dog', 'Cat']
                        }
                    }
                });
            }).toThrowError('Only Union and Enum types can be passed as an array, Type: interface');
        });

        it('Can add strings to schema', () => {
            const sync = new Dynasync(stack, 'DynasyncConstruct', {
                userPool,
                configFile: pathToJson,
            });
            sync.addToSchema('union DogAndCat = Dog | Cat');
            template = Template.fromStack(stack);
            template.hasResourceProperties("AWS::AppSync::GraphQLSchema", {
                Definition: Match.stringLikeRegexp('union DogAndCat = Dog | Cat')
            });
        });

        it('Can use subscriptions', () => {
            new Dynasync(stack, 'DynasyncConstruct', {
                userPool,
                configFile: pathToJson,
                tables: [{
                    tableName: "Updates",
                    partitionKey: "time",
                    subscription: true,
                    attributes: {
                        time: 'AWS_TIMESTAMP',
                        name: 'String',
                        event: 'String'
                    },
                }]
            });

            template = Template.fromStack(stack);
            template.hasResourceProperties("AWS::AppSync::Resolver", {
                TypeName: 'Subscription'    
            });
            template.hasResourceProperties("AWS::AppSync::GraphQLSchema", {
                Definition: Match.stringLikeRegexp('subscription')
            });
        });

        it('Fails when no schema declared', () => {
            expect(() => {
                const sync = new Dynasync(stack, 'DynasyncConstruct', {
                    userPool
                });
                const schema = sync.appsync.schema.root.declareSchema();
                expect(schema).toBeFalsy();
            }).toThrowError("No tables provided. Cannot build API and Database without tables. Please configure parameters or provide 'dynasync.json' config file");
        });

        it('Throws when additional table props are passed with already instantiated DbTable instance', () => {
            expect(() => {
                const tables = [new DbTable(stack, {
                        tableName: "Dog",
                        partitionKey: "dogId",
                        attributes: {
                            "dogId": "ID!",
                            "name": "String",
                        }
                    })
                ];

                new AppSyncStack(stack, "AppSyncStack", {
                    config: {
                        userPool: new UserPool(stack, 'Pool')
                    },
                    tables,
                    tableProps: {
                        billingMode: BillingMode.PAY_PER_REQUEST
                    }
                })
            }).toThrowError(`Cannot pass additional table props when using already-instantiated DbTable instance for table Dog`)
        });


        it("Passes api props", () => {
            const sync = new Dynasync(stack, 'DynasyncConstruct', {
                userPool,
                configFile: pathToJson,
                apiProps: {
                    xrayEnabled: false
                }
            });
            template = Template.fromStack(stack);
            template.hasResourceProperties("AWS::AppSync::GraphQLApi", {
                XrayEnabled: false
            });
        });

        it("Passes table props", () => {
            new Dynasync(stack, 'DynasyncConstruct', {
                userPool,
                configFile: pathToJson,
                tableProps: {
                    billingMode: BillingMode.PAY_PER_REQUEST,
                    deletionProtection: true
                }
            });
            template = Template.fromStack(stack);
            template.hasResourceProperties("AWS::DynamoDB::Table", {
                BillingMode: "PAY_PER_REQUEST",
                DeletionProtectionEnabled: true
            });
        });
        
    });