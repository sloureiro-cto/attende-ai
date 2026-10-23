import { Document } from "mongoose"

declare enum ColumnType {
  task,
  progress,
  concluded,
}

declare interface IColumnCategory extends Document {
  title: string
  color: string
  type: ColumnType
}

export { IColumnCategory }
