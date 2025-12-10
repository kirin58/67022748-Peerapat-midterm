import { Hono } from "hono";    
import * as z from "zod";
import { zValidator } from "@hono/zod-validator";
import db from "../db/index.js";

const CreateUserSchema = z.object({
  name: z.string("กรุณากรอกชื่อ").min(2 , "ชื่อต้องมีความยาวอย่างน้อย 2 ตัวอักษร"),
  email: z.email("รูปแบบอีเมลไม่ถูกต้อง"),
  phone: z.string()
  .min(10, "เบอร์โทรศัพท์ต้องมีความยาวอย่างน้อย 10 ตัวอักษร")
  .max(15, "เบอร์โทรศัพท์ต้องมีความยาวไม่เกิน 15 ตัวอักษร")
  .optional(),
});

const userRoutes = new Hono();

userRoutes.post('/', zValidator('json', CreateUserSchema), async (c) => {
    const body = await c.req.json();
    return c.json({ message: 'Create new user', data: body });
});

type User = {
  ID: number
  UserName: string
  FirstName: string
  LastName: string
  Password: string
}

userRoutes.get("/", async (c) => {
  let sql = 'SELECT * FROM users';
  let stmt = db.prepare<[],User>(sql);
  let users : User[] = stmt.all();

  return c.json({ message: "List of users" , data: users });
});

userRoutes.get("/:id", (c) => {
  const { id } = c.req.param();
  let sql = 'SELECT * FROM users WHERE ID = @id'
  let stmt = db.prepare<{id: string}, User>(sql)
  let user = stmt.get({id: id})

  return c.json({ 
    message: `User details for ID: ${id}`,
    data: user
     });
});

userRoutes.post("/", 
  zValidator('json', CreateUserSchema)
  , async (c) => {
  const body = await c.req.json()
  return c.json({ message: "Create new user", data: body });
});

export default userRoutes;