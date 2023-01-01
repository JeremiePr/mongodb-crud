import { AppApi } from "./api/app.api";
import { Context } from "./context";
import { ApiManager, app } from "./core/api-manager";
import { AppService } from "./services/app.service";

const context = new Context("mongodb://localhost:27017", "boringCompany");
const service = new AppService(context);
const api = new AppApi(service);

app.listen(7081, () =>
{
    ApiManager.build([api], true);
    console.log('Server running');
});