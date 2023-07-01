import { 
    IGraphqlApi, 
    ISchema, 
    ISchemaConfig 
} from 'aws-cdk-lib/aws-appsync';
import { DbTable } from '../db/table';
import { 
    SchemaAlpha,
    IntermediateParams, 
    IntermediateType, 
    IntermediateTypeProps, 
    IntermediateTypes, 
    SchemaFields
} from './schema-alpha';
import { SchemaObject } from '../types';
import { 
    GraphqlType, 
    BaseTypeOptions, 
    ObjectType, 
    IIntermediateType, 
    InputType, 
    InterfaceType, 
    UnionType, 
    EnumType, 
    Directive, 
    Field, 
    GraphqlTypeOptions,
    IntermediateTypeOptions 
} from '@aws-cdk/aws-appsync-alpha';
import { capitalize, validateTable } from '../util';

export class AppSyncSchema implements ISchema {
    readonly root = new SchemaAlpha();

    protected tables:DbTable[] = [];
    protected graphTypes = ['id','string','int','float','boolean',
    'awsDate','awsTime','awsDateTime','awsTimestamp', 'awsEmail',
    'awsJson','awsUrl','awsPhone','awsIpAddress'];
    protected customTypes:string[] = []
    protected types:IntermediateTypes = {}

    constructor(types?:IntermediateParams) {
        if (types && Object.keys(types).length) this.initTypes(types);
    }

    bind(api:IGraphqlApi): ISchemaConfig {
        return this.root.bind(api);
    }

    addTable(table: DbTable): DbTable | false {

        if (this.tables.some(t => t.tableName === table.tableName)) return false;
        validateTable(table);
        const usedOperations:string[] = [];
        this.addType(table.baseName, {definition:table.attributes});
        let definition = {...table.attributes};
        delete definition[table.pName];
        if (table.sName) delete definition[table.sName];
        let inputName: string = ''
        if (Object.keys(definition).length) {
            inputName = `${table.baseName}Input`;
            this.addInput(inputName, {definition});
        }
        const inputObject = inputName ? { input: inputName } : undefined;

        /** QUERIES */
        if (table.query) {
            if (table.scan) {
                this.root.addQuery(`scan${table.baseName}`, this.getField(table.baseName, {}, {isList:true}));
            }

            let getName = `get${table.baseName}By${capitalize(table.pName)}`;
            if (table.sName) getName += `And${capitalize(table.sName)}`;
            if (!usedOperations.includes(getName)) {
                this.root.addQuery(getName, this.getField(table.baseName, {
                    [table.pName]: table.attributes[table.pName]
                }, {isList:false}));
                usedOperations.push(getName);
            }

            if (table.sName) {
                const partitionKeyName = `list${table.baseName}By${capitalize(table.pName)}`;
                if (!usedOperations.includes(partitionKeyName)) {
                    this.root.addQuery(partitionKeyName, this.getField(table.baseName, {
                        [table.pName]: table.attributes[table.pName]
                    }, {isList:true}));
                    usedOperations.push(partitionKeyName);
                }
            }

            // Loop through indexes
            if (table.globalSecondaryIndexes?.length) {
                table.globalSecondaryIndexes.forEach(index => {
                    const prefix = (index.sortKey || index.list) ? 'list' : 'get';
                    const getIndexName = `${prefix}${table.baseName}By${capitalize(index.pName)}`
        
                    if (!usedOperations.includes(getIndexName)) {
                        this.root.addQuery(getIndexName, this.getField(table.baseName, {
                            [index.pName]: table.attributes[index.pName]
                        }, {isList:!!(index.sortKey || index.list)}));
                        usedOperations.push(getIndexName);
                    }
        
                    if (index.sName) {
                        const sortName = `get${table.baseName}By${capitalize(index.partitionKey.name)}And${capitalize(index.sName)}`
        
                        if (!usedOperations.includes(sortName)) {
                            this.root.addQuery(sortName, this.getField(table.baseName, {
                                [index.pName]: table.attributes[index.pName],
                                [index.sName]: table.attributes[index.sName]
                            }, {isList:false}));
                            usedOperations.push(sortName);
                        }
                    }
                })

                if (table.localSecondaryIndexes?.length) {
                    table.localSecondaryIndexes.forEach(index => {
                        const localName = `get${table.baseName}By${capitalize(table.pName)}And${capitalize(index.sName)}`
                        if (!usedOperations.includes(localName)) {
                            this.root.addQuery(localName, this.getField(table.baseName, {
                                [table.pName]: table.attributes[table.pName],
                                [index.sName]: table.attributes[index.sName]
                            }, {isList:false}));
                            usedOperations.push(localName);
                        }
                    })
                }
            }
        }

        const primaryParams = { 
            [table.pName]: table.attributes[table.pName],
        }
        if (table.sName) primaryParams[table.sName] = table.attributes[table.sName];
        /** MUTATIONS */
        if (table.mutation) {
            if (table.auto) {
                this.root.addMutation(`create${table.baseName}`, this.getField(table.baseName, inputObject));
            }      
            const mutationParams = {
                ...primaryParams,
                ...(inputObject || {})
            }
            this.root.addMutation(`put${table.baseName}`, this.getField(table.baseName, mutationParams));
            this.root.addMutation(`delete${table.baseName}`, this.getField(table.baseName, primaryParams));
        }

        /** SUBSCRIPTIONS */
        if (table.subscription) {
            this.root.addSubscription(`on${table.baseName}Change`, this.getField(table.baseName, primaryParams));
        }

        this.tables.push(table);
        return table;
    }

    getType($type:string | GraphqlType, $options: GraphqlTypeOptions = {}): GraphqlType {
        if (typeof $type !== 'string') return $type;
        const options = this.getBaseOptions($type, $options);
        const name = $type.replace(/[^a-z\_]/gi, '');
        const str = this.convertTypeName(name);
        if (this.graphTypes.includes(str)) return GraphqlType[str](options);
        if (!this.isType(str)) throw new Error(`${name} is not a valid Type`);
        return GraphqlType.intermediate({
            intermediateType:this.types[name],
            ...options
        });
    }

    getTypes(obj:SchemaObject = {}): SchemaFields {
        const res:SchemaFields = {}
        for (let o in obj) {
            if (obj.hasOwnProperty(o)) {
                res[o] = this.getType(obj[o])
            }
        }
        return res;
    }

    getField(returnType: string, fields?: SchemaObject, $options: GraphqlTypeOptions = {}, directives?:Directive[]): Field {
        const args = fields && Object.keys(fields).length ? this.getTypes(fields) : undefined;
        return new Field({
            returnType: this.getType(returnType, $options),
            args,
            directives
        })
    }

    isType(type:string): boolean {
        const name = this.convertTypeName(type);
        return this.graphTypes.includes(name) || this.customTypes.includes(name);
    }

    addType(name:string, props: IntermediateTypeProps):IIntermediateType {
        return this.$addType('type', name, props);
    }

    addInput(name:string, props: IntermediateTypeProps):IIntermediateType {
        return this.$addType('input', name, props);
    }
    
    getBaseOptions(type:string, $options: GraphqlTypeOptions = {}): BaseTypeOptions {
        return {
            isList:/^\[[a-z]+[\?\!]?\]/i.test(type),
            isRequired:/^\[?[a-z]+\!\]?[\?\!]?$/i.test(type),
            isRequiredList:/\]\!$/.test(type),
            ...$options
        }
    }

    initTypes(types:IntermediateParams = {}) {
        for (let intermediateType in types) {
            if (types.hasOwnProperty(intermediateType)) {
                const keys = Object.keys(types[intermediateType]);
                if (keys.length) {
                    const type = types[intermediateType];
                    for (let typeName in type) {
                        if (type.hasOwnProperty(typeName)) {
                            const inter = intermediateType.substring(0, intermediateType.length - 1);
                            this.$addType(inter as IntermediateType, typeName, type[typeName]);
                        }
                    }
                }
            }
        }
    }

    protected $addType(
        type:IntermediateType, 
        $name:string, 
        props: SchemaObject | IntermediateTypeProps | (string | IIntermediateType)[]
    ): IIntermediateType {
        const name = $name.replace(/[^a-z\_]/gi, '');
        const str = this.convertTypeName(name);
        if (this.customTypes.some(a => a === str)) return this.types[name];        
        this.customTypes.push(str);
        if (Array.isArray(props)) {
            if (type === 'union') {
                const definition:IIntermediateType[] = props.map(prop => {
                    if (typeof prop === 'string') return this.types[prop];
                    return prop;
                },this);
                this.types[name] = new UnionType(name,{definition});
            } else if (type === 'enum') {
                const definition:string[] = props.map(prop => {
                    if (typeof prop !== 'string') throw new Error('Enum types must contain strings only.');
                    return prop;
                });
                this.types[name] = new EnumType(name,{definition});
            } else {
                throw new Error('Only Union and Enum types can be passed as an array, Type: ' + type);
            }
        } else {
            const definition = (props.definition && typeof props.definition === 'object') ? 
                this.getTypes(props.definition) : this.getTypes(props as SchemaObject)
            const options:IntermediateTypeOptions = {
                ...props,
                definition
            }

            switch(type) {
                case 'type': this.types[name] = new ObjectType(name, options);
                break;
                case 'input': this.types[name] = new InputType(name, options);
                break;
                case 'interface': this.types[name] = new InterfaceType(name, options);
                break;
                default: throw new Error(`Type "${type}" is not compatible with props provided`);
            }
        }
        this.root.addType(this.types[name]);
        return this.types[name]
    }

    private convertTypeName(type:string): string {
        if (!type.length) return type;
        const words = type.split('_');
        const firstWord = words.shift()?.toLowerCase() || '';
        return firstWord + words.map(w => 
            w.substring(0,1).toUpperCase() + w.substring(1).toLowerCase()
        ).join('');
    }
}