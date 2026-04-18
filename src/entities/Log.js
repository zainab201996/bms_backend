const { EntitySchema } = require("typeorm");

const LogEntity = new EntitySchema({
  name: "Log",
  tableName: "logs",
  columns: {
    id: {
      type: "int",
      primary: true,
      generated: true
    },
    user_id: {
      type: "int"
    },
    action: {
      type: String
    },
    metadata: {
      type: "jsonb",
      nullable: true
    },
    timestamp: {
      type: "timestamptz",
      createDate: true
    }
  },
  relations: {
    user: {
      type: "many-to-one",
      target: "User",
      joinColumn: { name: "user_id" },
      onDelete: "CASCADE"
    }
  }
});

module.exports = {
  LogEntity
};
