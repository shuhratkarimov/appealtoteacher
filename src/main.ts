import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const PORT = process.env.PORT || 4001 || 4002;
  await app.listen(PORT, () => {
    console.log("Server is running on the port: " + PORT);
  });
}
bootstrap();
