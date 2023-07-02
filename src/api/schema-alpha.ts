import { IGraphqlApi, ISchemaConfig } from "aws-cdk-lib/aws-appsync";
import { 
    GraphqlApi as GraphqlApiAlpha, 
    Field, 
    IIntermediateType, 
    ObjectType, 
    ResolvableField, 
} from "@aws-cdk/aws-appsync-alpha";
import { Lazy } from "aws-cdk-lib";

/**
 * Class based on aws-appsync alpha Schema class,
 * deprecated in stable version but needed for
 * building schema in-progress
 */
export class SchemaAlpha {
    public baseTypes: IIntermediateType[] = [];
    public query?: ObjectType;
    public mutation?: ObjectType;
    public subscription?: ObjectType;
    protected def:string = '';

    bind(api:IGraphqlApi): ISchemaConfig {
        return {
            apiId: api.apiId,
            definition: Lazy.string({
                produce: () => this.baseTypes.reduce((acc, type) => 
                    `${acc}${type._bindToGraphqlApi(api as unknown as GraphqlApiAlpha).toString()}\n`,
                    `${this.declareSchema()}${this.def}`)
            })
        };
    }

    getDefinition(api:IGraphqlApi): string {
        return this.baseTypes.reduce((acc, type) => 
                `${acc}${type._bindToGraphqlApi(api as unknown as GraphqlApiAlpha).toString()}\n`,
                `${this.declareSchema()}${this.def}`);
    }

    addToSchema(addition:string, delimiter:string = '') {
        this.def += `${delimiter}${addition}\n`;
    }

    addQuery(fieldName: string, field: ResolvableField) {
        if (!this.query) {
            this.query = new ObjectType('Query', { definition: {} });
            this.addType(this.query);
        };
        this.query.addField({ fieldName, field });
        return this.query;
    }

    addMutation(fieldName: string, field: ResolvableField) {
        if (!this.mutation) {
            this.mutation = new ObjectType('Mutation', { definition: {} });
            this.addType(this.mutation);
        }
        ;
        this.mutation.addField({ fieldName, field });
        return this.mutation;
    }

    addSubscription(fieldName: string, field: Field) {
        if (!this.subscription) {
            this.subscription = new ObjectType('Subscription', { definition: {} });
            this.addType(this.subscription);
        }
        const directives = field.fieldOptions?.directives?.filter((directive) => directive.mutationFields);
        if (directives && directives.length > 1) {
            throw new Error(`Subscription fields must not have more than one directive. Received: ${directives.length}`);
        }
        this.subscription.addField({ fieldName, field });
        return this.subscription;
    }

    addType(type: IIntermediateType) {
        this.baseTypes.push(type);
        return type;
    }
    
    declareSchema() {
        if (!this.query && !this.mutation && !this.subscription) {
            return '';
        }
        const list = ['query', 'mutation', 'subscription'];
        return this.shapeAddition({
            prefix: 'schema',
            fields: list.map((key) => this[key] ? `${key}: ${this[key]?.name}` : '')
                .filter((field) => field != ''),
        }) + '\n';
    }

    private shapeAddition(options) {
        const typeName = () => { return options.name ? ` ${options.name}` : ''; };
        const interfaces = this.generateInterfaces(options.interfaceTypes);
        const directives = this.generateDirectives({
            directives: options.directives,
            modes: options.modes,
        });
        return options.fields.reduce((acc, field) => `${acc}  ${field}\n`, `${options.prefix}${typeName()}${interfaces}${directives} {\n`) + '}';
    }

    private generateInterfaces(interfaceTypes) {
        if (!interfaceTypes || interfaceTypes.length === 0)
            return '';
        return interfaceTypes.reduce((acc, interfaceType) => `${acc} ${interfaceType.name} &`, ' implements').slice(0, -2);
    }

    private generateDirectives(options) {
        if (!options.directives || options.directives.length === 0)
            return '';
        // reduce over all directives and get string version of the directive
        // pass in the auth modes for checks to happen on compile time
        return options.directives.reduce((acc, directive) => `${acc}${directive._bindToAuthModes(options.modes).toString()}${options.delimiter ?? ' '}`, ' ').slice(0, -1);
    }
}