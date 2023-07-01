import { BaseTypeOptions, GraphqlTypeOptions } from "@aws-cdk/aws-appsync-alpha";
import { DynamoAttribute } from "../types";

export class SyncType implements BaseTypeOptions {

    public readonly typeName: string;
    public readonly templateType: string
    public readonly graphqlType: string

    constructor(
        public readonly fieldName: string,
        graphqlType: string | SyncType = 'String'
    ) {
        this.graphqlType = (graphqlType instanceof SyncType) ? graphqlType.graphqlType : graphqlType;
        this.typeName = this.graphqlType.replace(/[^a-z\_]/gi, '');
        this.templateType = this.toCfnTemplateType();
    }

    get isList(): boolean {
        return /^\[[a-z]+[\?\!]?\]/i.test(this.graphqlType);
    }

    get isRequired(): boolean {
        return /^\[?[a-z]+\!\]?[\?\!]?$/i.test(this.graphqlType)
    }

    get isRequiredList(): boolean {
        return /\]\!$/.test(this.graphqlType);
    }

    getBaseOptions(options: GraphqlTypeOptions = {}): BaseTypeOptions {
        return {
            isList:/^\[[a-z]+[\?\!]?\]/i.test(this.graphqlType),
            isRequired:/^\[?[a-z]+\!\]?[\?\!]?$/i.test(this.graphqlType),
            isRequiredList:/\]\!$/.test(this.graphqlType),
            ...options
        }
    }

    toDynamoAttribute(): DynamoAttribute {
        if (/(int|float|timestamp)/i.test(this.typeName)) return 'N';
        if (/boolean/i.test(this.typeName)) return 'B';
        return 'S'; 
    }

    toTypescriptType(): string {
        let type = this.typeName.toLowerCase();
        if (['int', 'float'].includes(type)) type = 'number';
        if (type === 'id') type = 'string';
        if (![
            'number',
            'string',
            'boolean'
        ].includes(type)) return 'Record<string,any>';
        if (this.isList) type += '[]';
        return type;
    }

    private toCfnTemplateType(): string {
        const words = this.typeName.split('_');
        const firstWord = words.shift()?.toLowerCase() || '';
        return firstWord + words.map(w => 
            w.substring(0,1).toUpperCase() + w.substring(1).toLowerCase()
        ).join('');
    }

}