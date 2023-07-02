## AWS Dynasync

![Build](https://img.shields.io/github/actions/workflow/status/awslabs/aws-dynasync/release.yml?style=plastic)
![License](https://img.shields.io/github/license/awslabs/aws-dynasync?style=plastic)

- [Installation](#installation)
- [Basic Implementation](#basic-implementation)
- [Custom Types](#custom-types)
- [Mapping the DB to the API](#mapping-the-db-to-the-api)
    - [Config File](#config-file)
    - [Index.ts](#indexts)
    - [Schema.graphql](#schemagraphql)
- [Interfaces](#interfaces)
    - [DynasyncProps](#dynasyncprops)
    - [SchemaTable](#schematable)
    - [SchemaGlobal](#schemaglobal)
    - [SchemaLocal](#schemalocal)
    - [GraphQlTypeList](#graphqltypelist)
    - [Capacity](#capacity)
- [Default Table Properties](#default-table-props)
- [Default API Properties](#default-api-props)
- [Security](#security)
- [License](#license)

`AWS Dynasync` allows you to create an AWS AppSync GraphQL Api and a set of Amazon DynamoDB tables with one command. Automate the building and provisioning of a GraphQL API using a single config file with AWS AppSync and Amazon DynamoDb to store the data. The process defines the data tables and GraphQl types to be used. Then using the AWS CDK all of the tables are created, all of the queries and mutations are generated, and all of the data sources connected to have a fully functioning API.

## Installation
```
npm install aws-dynasync
```

## Basic Implementation
```ts
   new Dynasync(scope, id);
``` 
If you instantiate the class without passing any properties, `Dynasync` will look for a config file called `dynasync.json` at the top level of your repository. Alternately you can change the path of the config file:
```ts
    new Dynasync(scope, id, {
        configFile: 'path/to/config.json'
    });
```
You can pass arguments programmatically or through the config file or both. If you use both, `Dynasync` will merge all tables and types passed programmatically with all tables and types in the config file rather than overwriting anything.

*dynasync.json:*
```json
    {
        "tables": [
            {
                "tableName": "Dog",
                "partitionKey": "dogId",
                "attributes": {
                    "dogId": "ID!",
                    "breed": "String!",
                    "age": "Int!",
                    "isHousebroken": "Boolean",
                    "name": "String",
                    "description": "String"
                }
            }
        ]
    }
```
*index.ts:*
```ts
    new Dynasync(scope, id, {
        tables: [
            {
                tableName: "Cat",
                partitionKey: 'catId',
                attributes: {
                    catId: "ID!",
                    breed: "String!",
                    age: "Int!",
                    isHousebroken: "Boolean",
                    name: "String",
                    description: "String"
                }
            }
        ]
    });
```
The previous snippet would produce `DynamoDB` tables for both `Dog` and `Cat`. Notice that the `attributes` field values are all GraphQL types. This is how `Dynasync` maps table attributes to GraphQL schema types. 

### Custom Types
As previously stated, the `attributes` field of the [SchemaTable](#schematable) object maps DynamoDB table attributes to GraphQL types. The previous examples only show attributes with built in GraphQL scalar types, but you can also use custom types. 

`Dynasync` already creates types and inputs for each `DynamoDB` table, so you can use any table name as a type in the attributes field of another table: 
```json
    {
        "tables": [
            {
                "tableName": "Dog",
                "partitionKey": "dogId",
                "attributes": {
                    "dogId": "ID!",
                    "name": "String",
                }
            },
                        {
                "tableName": "Cat",
                "partitionKey": "catId",
                "attributes": {
                    "catId": "ID!",
                    "name": "String",
                }
            },
            {
                "tableName": "Owner",
                "partitionKey": "ownerId",
                "attributes": {
                    "ownerId": "ID!",
                    "dogs": "[Dog]",
                    "cats": "[Cat]"
                }
            },
        ]
    }
```

But if you want to declare additional GraphQL types, inputs, interfaces, unions, or enums, you can do so using the `types` property:
```json
{
    "types": {
        "MyCustomType": {
            "customField1": "String"
        }
    },
    "enums": {
        "MyEnum": [
            "Value1",
            "Value2",
            "Value3"
        ]
    }
}
```

## Mapping the DB to the API
Here is an example of how `Dynasync` takes a single config file and maps it to an AppSync API:

### Config File
```json
{
    "tables": [
        {
            "tableName": "Dog",
            "partitionKey": "dogId",
            "auto": true,
            "scan": true,
            "attributes": {
                "dogId": "ID!",
                "breed": "String!",
                "age": "Int!",
                "isHousebroken": "Boolean",
                "name": "String",
                "description": "String"
            },
            "globalSecondaryIndexes": [
                "name",
                "age",
                "breed",
                "isHousebroken"
            ]
        },
        {
            "tableName": "Cat",
            "partitionKey": "catId",
            "auto": true,
            "scan": true,
            "attributes": {
                "catId": "ID!",
                "breed": "String!",
                "age": "Int!",
                "isHousebroken": "Boolean",
                "name": "String",
                "description": "String"
            },
            "globalSecondaryIndexes": [
                "name",
                "age",
                "breed",
                "isHousebroken"
            ]
        },
        {
            "tableName": "Event",
            "partitionKey": "eventId",
            "auto": true,
            "attributes": {
                "eventId": "ID!",
                "eventName": "String!",
                "startTime": "AWS_TIMESTAMP",
                "endTime": "AWS_TIMESTAMP"
            },
            "globalSecondaryIndexes": [
                {
                    "partitionKey": "eventName",
                    "sortKey": "startTime"
                }
            ]
        },
        {
            "tableName": "EventSignup",
            "partitionKey": "eventId",
            "sortKey": "dogId",
            "scan": true,
            "attributes": {
                "eventId": "String!",
                "dogId": "String!",
                "category": "String"
            },
            "globalSecondaryIndexes": [
                {
                    "partitionKey": "dogId",
                    "sortKey": "eventId"
                },
                {
                    "partitionKey": "category",
                    "sortKey": "dogId"
                }
            ],
            "localSecondaryIndexes": [ "category" ]
        }
    ],
    "types": {
        "enums": {
            "Terms": [
                "Term1",
                "Term2",
                "Term3"
            ],
            "Definitions": [
                "Def1",
                "Def2",
                "DevOps",
                "Mainframe",
                "Database",
                "Resiliency",
                "Infrastructure",
                "Connect",
                "SAP"
            ]
        }
    }
}
```

### Index.ts
```ts
import { App, Stack } from 'aws-cdk-lib';
import { Dynasync } from 'aws-dynasync'; 
import { UserPool } from 'aws-cdk-lib/aws-cognito';

const env = {
  account: "1234567890",
  region: "us-east-1"
}

const app = new App();
const stack = new Stack(app, 'dynasync-stack', {env});


const sync = new Dynasync(stack, 'DynasyncConstruct');
app.synth()
```

### Schema.graphql
```graphql
    schema {  
        query: Query 
        mutation: Mutation
    }
    
    type Dog {  
        dogId: ID!  
        breed: String!
        age: Int!
        isHousebroken: Boolean
        name: String
        description: String
    }
    
    input DogInput {
        breed: String!
        age: Int!
        isHousebroken: Boolean
        name: String
        description: String
    }
    
    type Query {
        scanDog: [Dog]
        getDogByDogId(dogId: ID!): Dog
        listDogByName(name: String): [Dog]
        listDogByAge(age: Int!): [Dog]
        listDogByBreed(breed: String!): [Dog]
        listDogByIsHousebroken(isHousebroken: Boolean): [Dog]
        scanCat: [Cat]
        getCatByCatId(catId: ID!): Cat
        listCatByName(name: String): [Cat]
        listCatByAge(age: Int!): [Cat]
        listCatByBreed(breed: String!): [Cat]
        listCatByIsHousebroken(isHousebroken: Boolean): [Cat]
        getEventByEventId(eventId: ID!): Event
        listEventByEventName(eventName: String!): [Event]
        getEventByEventNameAndStartTime(eventName: String! startTime: AWSTimestamp): Event
        scanEventSignup: [EventSignup]
        getEventSignupByEventIdAndDogId(eventId: String!): EventSignup
        listEventSignupByEventId(eventId: String!): [EventSignup]
        listEventSignupByDogId(dogId: String!): [EventSignup]
        getEventSignupByDogIdAndEventId(dogId: String! eventId: String!): EventSignup
        listEventSignupByCategory(category: String): [EventSignup]
        getEventSignupByCategoryAndDogId(category: String dogId: String!): EventSignup
        getEventSignupByEventIdAndCategory(eventId: String! category: String): EventSignup
    }
        
    type Mutation {
        createDog(input: DogInput): Dog
        putDog(dogId: ID! input: DogInput): Dog
        deleteDog(dogId: ID!): Dog
        createCat(input: CatInput): Cat
        putCat(catId: ID! input: CatInput): Cat
        deleteCat(catId: ID!): Cat
        createEvent(input: EventInput): Event
        putEvent(eventId: ID! input: EventInput): Event
        deleteEvent(eventId: ID!): Event
        putEventSignup(eventId: String! dogId: String! input: EventSignupInput): EventSignup
        deleteEventSignup(eventId: String! dogId: String!): EventSignup
    }
        
    type Cat {
        catId: ID!
        breed: String!
        age: Int!
        isHousebroken: Boolean
        name: String
        description: String
    }
        
    input CatInput {
        breed: String!
        age: Int!
        isHousebroken: Boolean
        name: String
        description: String
    }
        
    type Event {
        eventId: ID!
        eventName: String!
        startTime: AWSTimestamp
        endTime: AWSTimestamp
    }
    
    input EventInput {
        eventName: String!
        startTime: AWSTimestamp
        endTime: AWSTimestamp
    }
        
    type EventSignup {
        eventId: String!
        dogId: String!
        category: String
    }
        
    input EventSignupInput {
        category: String
    }
        
    enum Terms {
        Term1
        Term2
        Term3
    }
        
    enum Definitions {
        Def1
        Def2
        DevOps
        Mainframe
        Database
        Resiliency
        Infrastructure
        Connect
        SAP
    }
```

## Cognito User Pools
If you don't supply a Cognito User Pool when instantiating the `Dynasync` object, a basic one will be created. But since you'll most likely want to configure the User Pool yourself, it's highly advised to pass your own [IUserPool](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.IUserPool.html) as an argument:
```ts
const userPool = new UserPool(stack, "UserPool", {
  userPoolName: 'SyncPool',
  // ...configure user pool here
});

const sync = new Dynasync(stack, 'DynasyncConstruct', {
  userPool
});
```

## Interfaces

### DynasyncProps
- **tables** **(required)**: *[SchemaTable](#schematable)[]* - An array of [SchemaTable](#schematable) objects that will be used first to construct the Amazon DynamoDB tables, then will connect those tables to the Aws Appsync GraphQL API.
- **configFile** *(default: 'dynasync.json')*: *string* - Custom path to config file
- userPool *(default: a basic user pool will be created)*: *[IUserPool](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.IUserPool.html)* - The Cognito User Pool that the AppSync API will use for authentication and authorization
- **types** *(default: undefined)*: *[GraphQlTypeList](#graphqltypelist)* - Custom types in addition to the types and inputs created for each `DynamoDB` table
- **userPoolRegex** *(default: undefined)*: string - The value passed to the user pool config's [appIdClientRegex](https://docs.aws.amazon.com/appsync/latest/APIReference/API_UserPoolConfig.html) field
- **userPoolDeny** *(default: false)*: boolean - If true, the Cognito User Pool's default action will be `DENY` rather than `ALLOW`
- **tableProps** *(default: [Default API Props](#default-api-props))* - Override default properties of the CDK Appsync GraphQLAPI construct used to create the API

### SchemaTable
- **tableName** **(required)**: *string* - The name of the DynamoDB table to be created
- **partitionKey** **(required)**: *string* - The attribute name of the table's partition key.
- **sortKey** *(default: undefined)*: *string* - The attribute name of the table's sort key. See [here](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html) for more on `DynamoDB` partition and sort keys.
- **attributes** **(required)**: *object* - An object containing the attributes that will be stored in the table. The key must be the name of the attribute and the value must be the attribute's data type using GraphQL syntax. See [here](https://graphql.org/graphql-js/basic-types/) for more on GraphQL type syntax.
- **globalSecondaryIndexes** *(default: undefined)*: *string | [SchemaGlobal](#schemaglobal)* - An array of partition key names or [SchemaGlobal](#schemaglobal) objects that define what the table's Global Secondary Indexes (GSI) will be. See [here](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html) for more on Global Secondary Indexes.
- **localSecondaryIndexes** *(default: undefined)*: *string | [SchemaLocal](#schemalocal)* - An array of sort key names or [SchemaLocal](#schemalocal) objects that define what the table's  Local Secondary Indexes (LSI) will be. See [here](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/LSI.html) for more on Local Secondary Indexes.
- **scan** *(default: false)*: *boolean* - If true, will add an Appsync API call that performs a scan on the entire table.
- **auto** *(default: false)*: *boolean* - If true, will set table's Appsync API call to generate an auto ID when a new item is created.
- **subscription** *(default: false)*: *boolean* - If true, API will create GraphQL subscriptions for the table.
- **query** *(default: true)*: *boolean* - If true, API will create GraphQL queries for the table.
- **mutation** *(default: true)*: *boolean* - If true, API will create GraphQL mutations for the table.
- **tableProps** *(default: [Default Table Props](#default-table-props))* - Override default properties of the CDK DynamoDB Table construct used to create the tables

### SchemaGlobal
- **partitionKey** **(required)**: *string* - The attribute name of the secondary index's partition key.
- **sortKey** *(default: undefined)*: *string* - The attribute name of the secondary index's sort key.
- **indexName** *(default: auto-generated index name)*: *string* - The name of the Global Secondary Index
- **list** *(default: if sort key exists, true; otherwise false)*: *boolean* - Boolean value to indicate whether a Global Secondary Index with just a partition key will return a list or not. If a sort key is provided this will always be true because the sort key would be needed to find a unique item, but if just a partition key is provided and the partition key will not return a single, unique item, then this *MUST* be set to `true`.
- **include** *(default: undefined)*: *string* - A list of non-key table attribute names that will be included in the index. Providing a value for `include` will cause the index's [Attribute Projection](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html#GSI.Projections) to be `Include`.
- **capacity** *(default: undefined)*: *[Capacity](#capacity)* - Optionally declare the capacity for the index

### SchemaLocal
- **sortKey** **(required)**: *string* - The attribute name of the secondary index's sort key.
- **indexName** *(default: auto-generated index name)*: *string* - The name of the Local Secondary Index
- **include** *(default: undefined)*: *string* - A list of non-key table attribute names that will be included in the index. Providing a value for `include` will cause the index's [Attribute Projection](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/LSI.html#LSI.Projections) to be `Include`.

### GraphQlTypeList
- **types** *(default: undefined)*: *object* - Custom GraphQL types where the key is the type name and the value is an object that maps the type's fields to GraphQL syntaxed types
- **interfaces** *(default: undefined)*: *object* - Custom GraphQL interfaces where the key is the interface name and the value is an object that maps the interface's fields to GraphQL syntaxed types
- **inputs** *(default: undefined)*: *object* - Custom GraphQL interfaces where the key is the input name and the value is an object that maps the input's fields to GraphQL syntaxed types
- **unions** *(default: undefined)*: *object* - Custom GraphQL unions where the key is the union name and the value is an array of which types to use to form the union
- **enums** *(default: undefined)*: *object* - Custom GraphQL enums where the key is the enum name and the value is an array of strings representing each value in the enum

### Capacity
- **read** *(default: undefined)*: `number` - Read capacity for a global secondary index
- **write** *(default: undefined)*: `number` - Write capacity for a global secondary index

## Default Table Props
Besides `tableName`, `partitionKey`, and `sortKey` which are set at the top level of each [SchemaTable](#schematable) object, any properties that can be passed to an AWS CDK DynamoDB L2 Construct can be overridden using the `tableProps` field of the [DynasyncProps](#dynasyncprops) object. If these properties aren't overridden, the table defaults are:
```ts
    const tableProps = {
        readCapacity: 5,
        writeCapacity: 5,
        replicationTimeout: Duration.minutes(30),
        replicationRegions: undefined,
        // If replicationRegions exist
        billingMode: BillingMode.PAY_PER_REQUEST,
        // If no replicationRegions exist
        billingMode: BillingMode.PROVISIONED,
        pointInTimeRecovery: true,
        tableClass: TableClass.STANDARD,
        encryption: TableEncryption.DEFAULT,
        encryptionKey: undefined,
        timeToLiveAttribute: undefined,
        // If replicationRegions exist
        stream: StreamViewType.NEW_AND_OLD_IMAGES,
        // If no replicationRegions exist
        stream:undefined,
        waitForReplicationToFinish: true,
        contributorInsightsEnabled: false,
        deletionProtection: false,
        kinesisStream: undefined,
        removalPolicy: RemovalPolicy.RETAIN
    }
```

## Default API Props
Besides `name`, `schema`, and `authorizationConfig` which are set using values passed at the top level of the [DynasyncProps](#dynasyncprops) object, any properties that can be passed to an AWS CDK Appsync GraphQL API L2 Construct can be overridden using the `apiProps` field of the [DynasyncProps](#dynasyncprops) object. If these properties aren't overridden, the api defaults are:
```ts
    const apiProps = {
        xrayEnabled: true
        logConfig: undefined
        domainName: undefined
    }
```

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This project is licensed under the Apache-2.0 License.

