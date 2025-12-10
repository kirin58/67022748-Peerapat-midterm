import { Hono } from "hono";
import * as z from "zod";
import { zValidator } from "@hono/zod-validator";

const productsRoutes = new Hono();

const createProductSchema = z.object({
  product_id: z.string()
    .regex(/^\d{5}$/, "product_id ต้องเป็นตัวเลข 5 หลัก"),
  name: z.string("กรุณากรอกชื่อ")
    .min(5, "ชื่อสินค้าต้องยาวไม่น้อยกว่า 5 ตัวอักษร"),
  price: z.number("กรุณากรอกเป็นตัวเลข"),
  cost: z.number("กรุณากรอกเป็นตัวเลข"),
  note: z.string().optional(),
});

productsRoutes.post('/', 
  zValidator('json', createProductSchema), 
  async (c) => {
    const body = await c.req.json()
    return c.json({message: 'Product created', data: body})
  }
);

export default productsRoutes
