import { BaseEntity } from "./base-entity.model";

export class Article extends BaseEntity
{
    public ref: string;
    public name: string;
    public price: number;

    public constructor()
    {
        super();
        this.ref = '';
        this.name = '';
        this.price = 0;
    }
}