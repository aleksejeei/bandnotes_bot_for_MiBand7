import aiosqlite
import asyncio

async def create_table():
    async with aiosqlite.connect('data.db') as conn:
        await conn.execute("""CREATE TABLE IF NOT EXISTS wait_note(
                            userid INT,
                            );
                            """)
        await conn.commit()



async def add_null_list(user_id):
    async with aiosqlite.connect('data.db') as conn:
        await conn.execute("INSERT INTO notes VALUES(?, ?);", (user_id, '[]'))
        await conn.commit()


async def check_note(user_id):
    async with aiosqlite.connect('data.db') as conn:
        read = await conn.execute(f'SELECT notes from notes WHERE userid={user_id}')
        result = await read.fetchone()
        result = eval(str(result))[0]
        return eval(result)

async def deleter(user_id, table='notes'):
    async with aiosqlite.connect('data.db') as conn:
        await conn.execute(f"DELETE FROM {table} WHERE userid={user_id};")
        await conn.commit()

async def write_notes(user_id, notes):
    notes = str(notes)
    async with aiosqlite.connect('data.db') as conn:
        await conn.execute(f'INSERT INTO notes VALUES(?, ?);', (user_id, notes))
        await conn.commit()

async def write_pages(user_id, page):
    async with aiosqlite.connect('data.db') as conn:
        await conn.execute(f'INSERT INTO pages VALUES(?, ?);', (user_id, page))
        await conn.commit()

async def check_pages(user_id):
    async with aiosqlite.connect('data.db') as conn:
        read = await conn.execute(f'SELECT page from pages WHERE userid={user_id}')
        result = await read.fetchone()
        result = eval(str(result))[0]
        return result



#asyncio.run(create_table())