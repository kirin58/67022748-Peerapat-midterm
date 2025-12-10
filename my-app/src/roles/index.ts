import { Hono } from "hono";
import * as z from 'zod'
import { zValidator } from "@hono/zod-validator";
import db from "../db/index.js";

const roleRoutes = new Hono()

type Role = {
    id : number
    name : string
}

roleRoutes.get('/',async(c) => {
    let sql = 'SELECT * FROM roles'
    let stmt = db.prepare<[],Role>(sql)
    let role : Role[] = stmt.all()
    return c.json({ message: "List of Role" , data : role });
} )

roleRoutes.get('/:id',(c) => {
    const{id} = c.req.param()
    let sql = 'SELECT * FROM roles WHERE id = @id'
    let stmt = db.prepare<{id:string},Role>(sql)
    let role = stmt.get({id:id})
    if (!role) {
        return c.json({message : 'Role not found'},404)
    }
    return c.json({
        message : 'USer details for ID: ${id}',
        data : role
    });
})

const createRoleSchema = z.object({
    name: z.string("กรุณากรอกชื่อ")
        .min(5,"ตำแหน่งต้องมีความยาวอย่างน้อย 5 ตัวอักษร"),
})

roleRoutes.post('/',
    zValidator('json',createRoleSchema,(result,c) => {
        if(!result.success){
            return c.json({
                message: 'Validation Failed',
                errors : result.error.issues},400)
        }
    })
    , async (c) => {
        const body = await c.req.json()
        let sql = `INSERT INTO roles 
        (name)VALUES(@name);`
        let stmt = db.prepare<Omit<Role,"id">,Role>(sql)
        let result = stmt.run(body)

        if(result.changes === 0) {
            return c.json({message: 'Faild to create role'},500)
        }
        let lastRowid = result.lastInsertRowid as number
        let sql2 = 'SELECT * FROM roles WHERE id = ?'
        let stmt2 = db.prepare<[number],Role>(sql2)
        let newRole = stmt2.get(lastRowid)
        return c.json({message: 'Role created', data: newRole},201)
})

const updateRoleSchema = z.object({
    name: z .string("กรุณากรอกชื่อ")
        .min(5,"ตำแหน่งต้องมีความยาวอย่างน้อย 5 ตัวอักษร"),
})
roleRoutes.put('/:id',
    zValidator("json",updateRoleSchema,(result,c) => {
        if(!result.success){
            return c.json(
                {message: 'Validation Failed',
                errors : result.error.issues},400)
        }
    }),async (c) => {
        const{ id } = c.req.param()
        const body = await c.req.json()
        let sql = 'SELECT * FROM roles WHERE id = @id'
        let stmt = db.prepare<{id:string},Role>(sql)
        let role = stmt.get({id:id})
        if (!role) {
            return c.json({message : 'Role not found'},404)
        }
        let update = `UPDATE roles 
            SET name = @name WHERE  id = @id `
        let updateStmt = db.prepare<{id: string; name:string}>(update);
        let result = updateStmt.run({id, name:body.name})
        
        if (result.changes === 0) {
            return c.json({message:"Failed to update role"},500)
        }

        let select = "SELECT * FROM roles WHERE id = ?"
        let selectStmt = db.prepare<[string],Role>(select)
        let updated = selectStmt.get(id)

        return c.json({message:"Role Update", data: updated},200)
    }
)

const pathRoleSchema = z.object({
    name: z .string("กรุณากรอกชื่อ")
        .min(5,"ตำแหน่งต้องมีความยาวอย่างน้อย 5 ตัวอักษร")
        .optional(),
})

roleRoutes.patch("/:id",
    zValidator("json",pathRoleSchema,(result,c) => {
        if(!result.success){
            return c.json(
                {message: 'Validation Failed',
                errors : result.error.issues},400)}
    }),async(c) => {
        const{ id } = c.req.param()
        const body = await c.req.json()
        let sql = 'SELECT * FROM roles WHERE id = @id'
        let stmt = db.prepare<{id:string},Role>(sql)
        let role = stmt.get({id:id})
        if (!role) {
            return c.json({message : 'Role not found'},404)
        }
        const update = []
        const params: any = {id};
        if (body.name !== undefined) {
            update.push("name = @name");
            params.name = body.name;
        }

        if (update.length === 0) {
            return c.json({ message: "No fields to update" }, 400);
        }

        const updatesql = `UPDATE roles SET ${update.join(", ")} WHERE id = @id`
        const stmt2 = db.prepare(updatesql)
        const result = stmt2.run(params);
        if (result.changes === 0) {
            return c.json({ message: "Failed to update role" }, 500);
        }

        const updated = db.prepare("SELECT * FROM roles WHERE id = ?").get(id);
        return c.json({ message: "Role updated", data: updated }, 200);
    }
)

roleRoutes.delete('/:id', async (c) => {
    const {id} = c.req.param()

    let sql = 'SELECT * FROM roles WHERE id = @id'
    let stmt = db.prepare<{id:string},Role>(sql)
    let role = stmt.get({id:id})

    if (!role) {
        return c.json({message : 'Role not found'},404)
    }

    const deleterole = `DELETE FROM roles WHERE id = @id`
    const deleteStmt = db.prepare<{id:string}>(deleterole)
    deleteStmt.run({id})

    return c.json({message: 'Delete Role'},200)
})
export default roleRoutes