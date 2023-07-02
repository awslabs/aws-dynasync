import { join } from "path";

export const pathToJson = join(__dirname, 'dynasync.json');

export const  passedTypes =  {               
    types: {
        enums: {
            EventTypes: [
                "local",
                "global"
            ]
        },
        unions: {
            DogAndCat: ['Dog', 'Cat']
        },
        interfaces: {
            MyInterface: {
                place: 'String'
            }
        }
    }
}

export const integPassedTypes = {
    tables: [
        {
            tableName: "Fish",
            partitionKey: "fishId",
            sortKey: "type",
            auto: true,
            attributes: {
                "fishId": "ID!",
                "type": "String!",
                "age": "Int!",
                "name": "String",
                "description": "String"
            }
        }
    ],
    ...passedTypes
}