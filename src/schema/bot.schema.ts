import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type StudentDocument = Student & Document
export type BlockListDocument = BlockList & Document

@Schema()
export class Student {
    @Prop({required: true, unique: true})
    chatId: number

    @Prop({required: true})
    name: string

    @Prop({required: true, default: false})
    isGranted: boolean

    @Prop({required: false, default: "Registered"})
    message: string
    
    @Prop({required: false, default: new Date().toISOString()})
    timeAndDate: Date
} 

export class BlockList {
    @Prop({required: true, unique: true})
    chatId: number
    
    @Prop({required: false, default: new Date().toISOString()})
    date: Date
}

export const BlockListSchema = SchemaFactory.createForClass(BlockList)
export const StudentSchema = SchemaFactory.createForClass(Student)