import { Hono } from "hono";
import * as z from 'zod';
import { zValidator } from "@hono/zod-validator";
import db from "../db/index.js";

const invoiceRoutes = new Hono();

type Invoice = {
    InvoiceID: number;
    InvoiceDate: string;
    Amount: number;
    Status: string;
    DueDate: string;
}


invoiceRoutes.get('/', async (c) => {
    try {
        let sql = 'SELECT * FROM Invoice';
        let stmt = db.prepare<[], Invoice>(sql);
        let invoices: Invoice[] = stmt.all();
        return c.json({ message: "List of Invoices", data: invoices });
    } catch (error) {
        return c.json({ message: "Error fetching invoices", error: String(error) }, 500);
    }
});


invoiceRoutes.get('/:id', (c) => {
    const { id } = c.req.param();
    let sql = 'SELECT * FROM Invoice WHERE InvoiceID = @id';
    let stmt = db.prepare<{ id: string }, Invoice>(sql);
    let invoice = stmt.get({ id: id });
    
    if (!invoice) {
        return c.json({ message: 'Invoice not found' }, 404);
    }
    return c.json({
        message: `Invoice details for ID: ${id}`,
        data: invoice
    });
});


const invoiceSchema = z.object({
    InvoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)"),
    Amount: z.number().positive("ยอดเงินต้องมากกว่า 0"),
    Status: z.string().min(1, "กรุณาระบุสถานะ"),
    DueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)"),
});


invoiceRoutes.post('/',
    zValidator('json', invoiceSchema, (result, c) => {
        if (!result.success) {
            return c.json({
                message: 'Validation Failed',
                errors: result.error.issues
            }, 400);
        }
    }),
    async (c) => {
        const body = await c.req.json();
        
        let sql = `INSERT INTO Invoice (InvoiceDate, Amount, Status, DueDate) 
                   VALUES (@InvoiceDate, @Amount, @Status, @DueDate)`;
        
        // เตรียม Statement
        let stmt = db.prepare(sql);
        
        try {
            let result = stmt.run({
                InvoiceDate: body.InvoiceDate,
                Amount: body.Amount,
                Status: body.Status,
                DueDate: body.DueDate
            });

            if (result.changes === 0) {
                return c.json({ message: 'Failed to create invoice' }, 500);
            }

            let lastRowid = result.lastInsertRowid as number;
            let sql2 = 'SELECT * FROM Invoice WHERE InvoiceID = ?';
            let stmt2 = db.prepare<[number], Invoice>(sql2);
            let newInvoice = stmt2.get(lastRowid);
            
            return c.json({ message: 'Invoice created', data: newInvoice }, 201);
        } catch (error) {
            return c.json({ message: 'Database Error', error: String(error) }, 500);
        }
    }
);

invoiceRoutes.put('/:id',
    zValidator("json", invoiceSchema, (result, c) => {
        if (!result.success) {
            return c.json({
                message: 'Validation Failed',
                errors: result.error.issues
            }, 400);
        }
    }),
    async (c) => {
        const { id } = c.req.param();
        const body = await c.req.json();

        
        let checkSql = 'SELECT * FROM Invoice WHERE InvoiceID = @id';
        let checkStmt = db.prepare<{ id: string }, Invoice>(checkSql);
        let existing = checkStmt.get({ id: id });

        if (!existing) {
            return c.json({ message: 'Invoice not found' }, 404);
        }

        let updateSql = `UPDATE Invoice 
                         SET InvoiceDate = @InvoiceDate, 
                             Amount = @Amount, 
                             Status = @Status, 
                             DueDate = @DueDate 
                         WHERE InvoiceID = @id`;
                         
        let updateStmt = db.prepare(updateSql);
        
        let result = updateStmt.run({
            InvoiceDate: body.InvoiceDate,
            Amount: body.Amount,
            Status: body.Status,
            DueDate: body.DueDate,
            id: id
        });

        if (result.changes === 0) {
            return c.json({ message: "Failed to update invoice" }, 500);
        }

        let select = "SELECT * FROM Invoice WHERE InvoiceID = ?";
        let selectStmt = db.prepare<[string], Invoice>(select);
        let updated = selectStmt.get(id);

        return c.json({ message: "Invoice Updated", data: updated }, 200);
    }
);

const patchInvoiceSchema = invoiceSchema.partial();


invoiceRoutes.patch("/:id",
    zValidator("json", patchInvoiceSchema, (result, c) => {
        if (!result.success) {
            return c.json({
                message: 'Validation Failed',
                errors: result.error.issues
            }, 400);
        }
    }),
    async (c) => {
        const { id } = c.req.param();
        const body = await c.req.json();

        let checkSql = 'SELECT * FROM Invoice WHERE InvoiceID = @id';
        let checkStmt = db.prepare<{ id: string }, Invoice>(checkSql);
        let existing = checkStmt.get({ id: id });

        if (!existing) {
            return c.json({ message: 'Invoice not found' }, 404);
        }

        const updates = [];
        const params: any = { id };

        if (body.InvoiceDate !== undefined) {
            updates.push("InvoiceDate = @InvoiceDate");
            params.InvoiceDate = body.InvoiceDate;
        }
        if (body.Amount !== undefined) {
            updates.push("Amount = @Amount");
            params.Amount = body.Amount;
        }
        if (body.Status !== undefined) {
            updates.push("Status = @Status");
            params.Status = body.Status;
        }
        if (body.DueDate !== undefined) {
            updates.push("DueDate = @DueDate");
            params.DueDate = body.DueDate;
        }

        if (updates.length === 0) {
            return c.json({ message: "No fields to update" }, 400);
        }

        const sql = `UPDATE Invoice SET ${updates.join(", ")} WHERE InvoiceID = @id`;
        const stmt = db.prepare(sql);
        const result = stmt.run(params);

        if (result.changes === 0) {
            return c.json({ message: "Failed to update invoice" }, 500);
        }

        const updated = db.prepare("SELECT * FROM Invoice WHERE InvoiceID = ?").get(id);
        return c.json({ message: "Invoice updated", data: updated }, 200);
    }
);


invoiceRoutes.delete('/:id', async (c) => {
    const { id } = c.req.param();

    let checkSql = 'SELECT * FROM Invoice WHERE InvoiceID = @id';
    let checkStmt = db.prepare<{ id: string }, Invoice>(checkSql);
    let existing = checkStmt.get({ id: id });

    if (!existing) {
        return c.json({ message: 'Invoice not found' }, 404);
    }

    const deleteSql = `DELETE FROM Invoice WHERE InvoiceID = @id`;
    const deleteStmt = db.prepare<{ id: string }>(deleteSql);
    deleteStmt.run({ id });

    return c.json({ message: 'Invoice Deleted' }, 200);
});

export default invoiceRoutes;