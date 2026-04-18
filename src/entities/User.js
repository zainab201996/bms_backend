const { EntitySchema } = require("typeorm");

const UserEntity = new EntitySchema({
  name: "User",
  tableName: "users",
  columns: {
    id: {
      type: "int",
      primary: true,
      generated: true
    },
    name: {
      type: String
    },
    email: {
      type: String,
      unique: true
    },
    username: {
      type: String,
      unique: true
    },
    password_hash: {
      type: String
    },
    type: {
      type: "enum",
      enum: ["ADMIN", "COMPANY", "EMPLOYEE"]
    },
    location: {
      type: String,
      nullable: true
    },
    created_at: {
      type: "timestamptz",
      createDate: true
    }
  }
});

module.exports = {
  UserEntity
};
