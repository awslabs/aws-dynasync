import { Attribute, AttributeType } from "aws-cdk-lib/aws-dynamodb";
import { SyncType } from "./sync-type";

export class KeyInstance {
    public readonly name: string
    public readonly keyType: 'partition' | 'sort'

    private $type: string

    constructor(
        fieldName: string | KeyInstance,
        $type?: string | SyncType,
        keyType?: 'partition' | 'sort',
    ) {
        if (fieldName instanceof KeyInstance) {
            this.name = fieldName.name;
            this.$type = $type ? 
                typeof $type === 'string' ? $type :
                $type.graphqlType :
                fieldName.type.graphqlType;
            this.keyType = keyType || fieldName.keyType;
        } else {
            this.name = fieldName;
            this.$type = $type ? 
                typeof $type === 'string' ? $type :
                $type.graphqlType :
                'String';
            this.keyType = keyType || 'partition';
        }
    }

    get templateType(): Record<string, string> {
        return {
            [this.name]: this.type.templateType
        }
    }

    get objectType(): Record<string, string> {
        return {
            [this.name]: this.type.graphqlType
        }
    }

    get attribute(): Attribute {
        return {
            name: this.name,
            type: this.convertAttributeName(this.type.toDynamoAttribute())
        }
    }

    get type(): SyncType {
        return new SyncType(this.name, this.$type)
    }

    convertAttributeName(attr:string): AttributeType {
        if (/^b/i.test(attr)) return AttributeType.BINARY;
        if (/^n/i.test(attr)) return AttributeType.NUMBER;
        return AttributeType.STRING;
    }
    


}