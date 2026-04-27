const { EntitySchema } = require("typeorm");

const BackupEntity = new EntitySchema({
  name: "Backup",
  tableName: "backups",
  columns: {
    id: {
      type: "int",
      primary: true,
      generated: true
    },
    company_id: {
      type: "int"
    },
    uploaded_by: {
      type: "int"
    },
    status: {
      type: "enum",
      enum: ["PENDING", "APPROVED", "REJECTED", "SUBMITTED"]
    },
    file_path: {
      type: String
    },
    renewed_file_path: {
      type: String,
      nullable: true
    },
    renewed_by: {
      type: "int",
      nullable: true
    },
    remarks: {
      type: String,
      nullable: true
    },
    company_remarks: {
      type: String,
      nullable: true
    },
    payment_screenshot_path: {
      type: String,
      nullable: true
    },
    created_at: {
      type: "timestamptz",
      createDate: true
    },
    updated_at: {
      type: "timestamptz",
      updateDate: true
    }
  },
  indices: [
    { columns: ["company_id"] },
    { columns: ["status"] }
  ],
  relations: {
    company: {
      type: "many-to-one",
      target: "User",
      joinColumn: { name: "company_id" },
      onDelete: "CASCADE"
    },
    uploader: {
      type: "many-to-one",
      target: "User",
      joinColumn: { name: "uploaded_by" },
      onDelete: "CASCADE"
    },
    renewedByUser: {
      type: "many-to-one",
      target: "User",
      joinColumn: { name: "renewed_by" },
      onDelete: "SET NULL",
      nullable: true
    }
  }
});

module.exports = {
  BackupEntity
};
