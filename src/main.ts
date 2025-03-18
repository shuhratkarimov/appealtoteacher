import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const PORT = process.env.PORT || 4005
  await app.listen(PORT, () => {
    console.log("Server is running on the port: " + PORT);
  });
}
bootstrap();
