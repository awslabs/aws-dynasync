import { KeyInstance } from "./instance";

export class BaseKey {

    protected getKey(key:string | KeyInstance) {
        return (key instanceof KeyInstance) ? key : new KeyInstance(key);
    }
}