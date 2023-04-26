from aiogram import Bot, Dispatcher, types, F
import asyncio
from aiogram.filters.command import Command
from aiogram.types.input_file import FSInputFile
from contextlib import suppress
from aiogram.exceptions import TelegramBadRequest
import kb
import db
import func

wait = []
name_note = {}

TOKEN = '' # Токен бота

bot = Bot(token=TOKEN)
dp = Dispatcher()

@dp.message(Command("file"))
async def send_file(message: types.Message):
    user_id = message.from_user.id
    content = await db.check_note(user_id)
    func.copy_files(user_id, content)
    doc = FSInputFile(f'{user_id}_notes.bin')
    await bot.send_document(chat_id=user_id, document=doc)
    func.rm_files(user_id)

@dp.message(Command("start"))
async def start(message: types.Message):
    user_id = message.from_user.id
    try:
       await db.add_null_list(user_id)
    except:
        pass
    username = message.from_user.first_name
    buttons = kb.main_menu()
    await message.answer(f'Здравствуйте, <b>{username}</b>. \nС помощью данного бота можно создавать заметки для браслета Mi Band 7.\n' \
                         '/delete - Удалить все заметки\n' \
                         '/file - Получить bin файл с приложением', parse_mode='HTML', reply_markup=buttons)

@dp.message(Command('delete'))
async def delete_notes(message: types.Message):
    await db.deleter(message.from_user.id)
    await db.add_null_list(message.from_user.id)
    await message.reply('Заметки удалены')

@dp.callback_query(F.data.contains("notes_add"))
async def send_random_value(callback: types.CallbackQuery):
    user_id = callback.from_user.id
    if user_id not in wait:
        wait.append(user_id)
    await callback.message.answer(
        'Напишите название заметки')
    await callback.answer()

@dp.callback_query(F.data.contains('check_notes'))
async def notes(callback: types.CallbackQuery):
    user_id = callback.from_user.id
    try:
        await db.deleter(user_id, table='pages')
    except:
        pass
    await db.write_pages(user_id, page=0)
    try:
        result = await kb.pages_notes(user_id)
        buttons = result[0]
        await callback.message.edit_text(f'Название: <b>{result[1]}</b>\n' \
                                         f'Содержание: {result[2]}', parse_mode='HTML', reply_markup=buttons)
    except:
        await callback.answer('У вас нет заметок :(')
    await callback.answer()

@dp.callback_query(F.data.startswith('nav_'))
async def navigation(callback: types.CallbackQuery):
    action = callback.data.split('_')[1]
    user_id = callback.from_user.id
    username = callback.from_user.first_name
    if action == 'next':
        page = await db.check_pages(user_id)
        await db.deleter(user_id, table='pages')
        await db.write_pages(user_id, page=page+1)
        result = await kb.pages_notes(user_id)
        buttons = result[0]
        with suppress(TelegramBadRequest):
            await callback.message.edit_text(f'Название: <b>{result[1]}</b>\n' \
                                         f'Содержание: {result[2]}', parse_mode='HTML', reply_markup=buttons)
        await callback.answer()

    elif action == 'back':
        page = await db.check_pages(user_id)
        await db.deleter(user_id, table='pages')
        await db.write_pages(user_id, page=page - 1)
        result = await kb.pages_notes(user_id)
        buttons = result[0]
        with suppress(TelegramBadRequest):
            await callback.message.edit_text(f'Название: <b>{result[1]}</b>\n' \
                                             f'Содержание: {result[2]}', parse_mode='HTML', reply_markup=buttons)
        await callback.answer()

    elif action == 'menu':
        await callback.message.edit_text(f'Здравствуйте, <b>{username}</b>. \nС помощью данного бота можно создавать заметки для браслета Mi Band 7.\n' \
                         '/delete - Удалить все заметки\n' \
                         '/file - Получить bin файл с приложением', parse_mode='HTML', reply_markup=kb.main_menu())

    elif action == 'delete':
        page = await db.check_pages(user_id)
        notes = list(await db.check_note(user_id))
        await db.deleter(user_id, table='notes')
        notes.pop(page)
        await db.write_notes(user_id, notes)
        await db.deleter(user_id, table='pages')
        try:
            await db.write_pages(user_id, page=page)
            result = await kb.pages_notes(user_id)
            buttons = result[0]
            await callback.message.edit_text('<code>Заметка удалена</code>\n' \
                                         f'Название: {result[1]}\n' \
                                         f'Содержание: {result[2]}', parse_mode='HTML', reply_markup=buttons)
        except:
            await callback.message.edit_text('<code>Заметка удалена</code>', parse_mode='HTML', reply_markup=kb.main_menu())
        await callback.answer('Заметка удалена', show_alert=True)

@dp.message(F.from_user.id.in_(wait)) # ожидание содержания заметки после указания её названия
async def wait_note(message: types.Message):
    user_id = message.from_user.id
    text = message.text
    wait.remove(user_id)
    name_note[user_id] = message.text
    await message.reply(f'Название заметки: <b>{text}</b>. Теперь напишите её содержание :)', parse_mode='HTML')

@dp.message(F.from_user.id.in_(name_note)) # ожидание названия заметки
async def add_note(message: types.Message):
    user_id = message.from_user.id
    name_note_user = name_note[user_id]
    content_user = message.text
    user_notes = await db.check_note(user_id)
    user_notes.append({"name": name_note_user, "content": content_user})
    await db.deleter(user_id)
    await db.write_notes(user_id, user_notes)
    await message.reply('Заметка записана :)', reply_markup=kb.main_menu())

async def main():
    await dp.start_polling(bot)
if __name__ == "__main__":
    asyncio.run(main())