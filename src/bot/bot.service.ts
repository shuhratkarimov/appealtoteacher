import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as TelegramBot from "node-telegram-bot-api";
import { BlockList, BlockListDocument, Student, StudentDocument } from "src/schema/bot.schema";

@Injectable()
export class BotService {
  private bot: TelegramBot;
  private readonly teacherChatId = 7515472989 // Define teacher ID as a constant
  constructor(
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    @InjectModel(BlockList.name) private blockListModel: Model<BlockListDocument>
  ) {
    try {
      this.bot = new TelegramBot(process.env.BOT_TOKEN as string, { polling: true });

      // Handle /start command
      this.bot.onText(/\/start/, async (msg) => {
        const isBlocked = await this.blockListModel.findOne({ chatId: msg.chat.id });
        if (isBlocked) {
          return this.bot.sendMessage(msg.chat.id, "You are blocked and don't have permission to use this bot!");
        }
        const chatId = msg.chat.id;
        const foundStudent = await this.studentModel.findOne({ chatId });
        if (!foundStudent) {
          const options = {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "✅ Give access", callback_data: JSON.stringify({ action: "grant", chatId }) },
                  { text: "❌ Add to blocklist", callback_data: JSON.stringify({ action: "block", chatId }) },
                ],
              ],
            },
          };
          await this.studentModel.create({
            chatId,
            name: msg.from?.first_name ?? msg.from?.username,
          });
          this.bot.sendMessage(
            this.teacherChatId,
            `New student registered:\nUserID: ${chatId}\nName: ${msg.from?.first_name}\nDo you give access?`,
            options
          );
          this.bot.sendMessage(chatId, `Sorry ${msg.from?.first_name}, you should be granted first to use this bot!`);
        } else if (foundStudent.isGranted) {
          this.bot.sendMessage(chatId, `Hello ${msg.from?.first_name}!\nPlease write your message below to chat with your teacher.`);
        }
      });

      // Handle callback queries (grant/block)
      this.bot.on("callback_query", async (callbackQuery) => {
        const message: any = callbackQuery.message;
        const chatId = message?.chat.id;
        const data = JSON.parse(callbackQuery.data as any);

        if (data.action === "grant") {
          await this.studentModel.findOneAndUpdate({ chatId: data.chatId }, { isGranted: true });
          await this.bot.deleteMessage(chatId as any, message.message_id).catch(console.error);
          this.bot.sendMessage(data.chatId, "You have been granted access! Use /start to begin.");
        }
        if (data.action === "block") {
          await this.blockListModel.create({ chatId: data.chatId }); // Fix: Use data.chatId, not chatId
          await this.bot.deleteMessage(chatId, message.message_id).catch(console.error);
          this.bot.sendMessage(data.chatId, "You have been blocked from using this bot!");
        }
      });

      // Handle messages
      this.bot.on("message", async (msg) => {
        const chatId = msg.chat.id;
        const isBlocked = await this.blockListModel.findOne({ chatId });
        if (isBlocked) {
          return this.bot.sendMessage(chatId, "You are blocked and can't use this bot!");
        }

        // Handle teacher's reply
        if (msg.reply_to_message && chatId === this.teacherChatId) {
          const originalMessageText: any = msg.reply_to_message.text;
          const originalSenderIdMatch = originalMessageText.match(/ID: (\d+)/);
          if (originalSenderIdMatch) {
            const studentChatId = parseInt(originalSenderIdMatch[1]);
            await this.bot.sendMessage(studentChatId, `Teacher's response: ${msg.text}`);
            this.bot.sendMessage(chatId, `Response sent to student (ID: ${studentChatId})`);
          } else {
            this.bot.sendMessage(chatId, "Could not find student ID in the replied message!");
          }
          return;
        }

        // Handle student messages
        const foundStudent = await this.studentModel.findOne({ chatId });
        if (foundStudent?.isGranted && msg.text !== "/start") {
          await this.bot.sendMessage(
            this.teacherChatId,
            `ID: ${chatId}\nFrom: ${msg.from?.first_name}\nMessage: ${msg.text}`
          );
          this.bot.sendMessage(chatId, `Your message was sent, ${msg.from?.first_name}!`, {
            reply_to_message_id: msg.message_id,
          });
        } else if (msg.text !== "/start") {
          this.bot.sendMessage(chatId, "You have no access!");
        }
      });
    } catch (error) {
      console.error("Bot initialization error:", error);
    }
  }
}