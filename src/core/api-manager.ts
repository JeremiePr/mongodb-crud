import express from 'express';
import cors from 'cors';
import { HttpMethods, ContentType } from './api-interface';

interface ILogger { log: (ltype: string, lmessage: string, lclass: string, lfunction: string) => Promise<void> };

// Serveur ExpressJs
export const app = express();

// Router pour les requêtes vers l'API
export const router = express.Router();

export const httpControllersCatalog: { [className: string]: string; } = {};

// Catalogue qui va stocker les méthodes http avec les décorateurs pour chaque classe api
// La syntaxe indique qu'il s'agit d'un dictionnaire avec [ clé = nom de la classe ] et [ valeur = liste des méthodes (nom, url, méthode http) http de la classe ]
export const httpMethodsCatalog: { [className: string]: Array<{ name: string; argTypes: Array<string>; url: string; httpType: HttpMethods; contentType: ContentType; }>; } = {};

// Catalogue qui va stocker les paramètres de méthode dont les données doivent provenir du payload de la requête (POST ou PUT), et non pas du query
// Le catalogue va stocker comme clé double {classe-méthode} et enregistrer la position/index du paramètre
export const httpBodyParamsCatalog: Array<{ className: string; methodName: string; bodyParamIndex: number; }> = [];

// Permet d'enregistrer les méthodes http utilisant les décorateurs de http-decorators pour qu'elles soient accessibles par des requêtes http via express js
export class ApiManager
{
    // Initialise l'API
    // Itère sur toutes les instances d'API et appelle la méthode 'buildControllerApi'
    // Définit la route par défaut
    public static async build(instances: Array<any>, showConsoleErrors: boolean): Promise<void>
    {
        app.use(express.urlencoded({ extended: true }));
        app.use(express.json());
        app.use(cors());

        for (const instance of instances)
        {
            await this.buildControllerApi(instance, showConsoleErrors);
        }

        app.use('/', router);
    }

    // Récupère toutes les méthodes décorées avec http qui sont liées à la classe de l'instance en paramètre
    // Pour chaque méthode, selon le type de requête, le router express va enregistrer la méthode http
    private static async buildControllerApi(instance: any, showConsoleErrors: boolean): Promise<void>
    {
        if (!httpMethodsCatalog[instance.constructor.name])
        {
            return;
        }

        const controllerRoute = httpControllersCatalog[instance.constructor.name] ?
            `/${httpControllersCatalog[instance.constructor.name]}` : '';

        // Itération sur les entrées du registre des méthodes de l'API
        for (const entry of httpMethodsCatalog[instance.constructor.name])
        {
            let response: any = null;
            let data: any = null;

            const route = `${controllerRoute}/${entry.url}`;

            switch (entry.contentType)
            {
                case ContentType.Data: // Si la méthode renvoie des données
                    // On récupère une méthode qui sera directement appelée par les requêtes http et qui va appeler la méthode API avec les bons paramètres
                    const httpMethod = this.getHttpMethod(instance.constructor.name, entry.name, entry.argTypes, instance, showConsoleErrors);
                    switch (entry.httpType)
                    {
                        case HttpMethods.Get: router.get(route, httpMethod); break;
                        case HttpMethods.Post: router.post(route, httpMethod); break;
                        case HttpMethods.Put: router.put(route, httpMethod); break;
                        case HttpMethods.Delete: router.delete(route, httpMethod); break;
                    }
                    break;

                case ContentType.File: // Si la méthode doit servir un fichier
                    response = (instance[entry.name] as (...args: any[]) => any).apply(instance);
                    data = response instanceof Promise ? await response : response;
                    router.get(route, (_: any, res: any) => res.sendFile(data));
                    break;

                case ContentType.Directory: // Si la méthode doit servir tous les fichiers d'un dossier
                    response = (instance[entry.name] as (...args: any[]) => any).apply(instance);
                    data = response instanceof Promise ? await response : response;
                    router.use(route, express.static(data));
                    break;

                default:
                    throw new Error('Api method content type is not within the expected values');
            }
        }
    }

    // Renvoie une méthode de callback http utilisée par express
    private static getHttpMethod = (className: string, methodName: string, argTypes: Array<string>, instance: any, showConsoleErrors: boolean): ((req: any, res: any) => void) =>
    {
        // Récupération de la méthode
        const baseMethod = instance[methodName] as (...args: any[]) => any;
        // Récupération de la liste des noms des arguments de la méthode
        const argNames = ApiManager.getMethodParametersNames(baseMethod.toString());
        // Récupération du paramètre (un seul par méthode) dont les données doivent venir du payload de la requête
        const bodyParam = httpBodyParamsCatalog.filter(e => e.className === className && e.methodName === methodName)[0];
        // Récupération de l'index du paramètre en question. Si la méthode n'a pas de décorateur @fromBody, l'index est à null
        const bodyParamIndex = bodyParam ? bodyParam.bodyParamIndex : null;

        // Méthode qui sera exécutée à chaque requête
        return async (req: any, res: any) =>
        {
            try
            {
                // Récupération des arguments
                const args = [];
                for (let index = 0; index < argNames.length; index++)
                {
                    let rawData: any;
                    // Si le paramètre est celui concerné par le body on utilise le req.body directement
                    if (index === bodyParamIndex)
                    {
                        args.push(req.body);
                    }
                    // Autrement on utilise le req.query.<nom du paramètre en question>
                    else
                    {
                        rawData = req.query[argNames[index]];
                        // Selon le type de l'argument on le convertit
                        switch (argTypes[index])
                        {
                            case 'String':
                                args.push(rawData ? rawData as string : '');
                                break;
                            case 'Number':
                                args.push(rawData ? +rawData : 0);
                                break;
                            case 'Boolean':
                                args.push(rawData ? rawData === 'true' : false);
                                break;
                            default:
                                args.push(rawData);
                                break;
                        }
                    }
                }

                // Appel de la méthode en y associant l'instance envoyée en paramètre
                // Il correspond au 'this' dans la méthode, correspondant à l'instance de la classe d'API
                // La méthode 'apply' fonctionne de cette manière : maMethode.apply(contexteOuInstanceAAssocier, listeDesArgumentsSousFormeDElipse)
                const response = baseMethod.apply(instance, args);

                // Objet de sortie
                let data: any = null;

                // Gestion de la réponse de la méthode si asynchrône (promise async await) ou non (object)
                if (response instanceof Promise)
                {
                    data = await response;
                }
                else
                {
                    data = response;
                }

                // Retour des données vers l'extérieur
                res.status(200).json(data);
            }
            catch (err)
            {
                const error: any = err;
                // Retour d'un code http 500 en cas d'erreur
                res.status(500).json(error);
                // Log de l'erreur
                if (showConsoleErrors)
                {
                    console.log(error);
                }
            }
        };
    }

    // Renvoie les noms des paramètres d'une méthode
    private static getMethodParametersNames(methodStr: string): Array<string>
    {
        return methodStr
            .slice(methodStr.indexOf('(') + 1, methodStr.indexOf(')'))
            .split(',')
            .map(argName => argName.trim());
    }
}