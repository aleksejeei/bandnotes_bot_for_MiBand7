from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram import types
import asyncio
import db

def main_menu():
    menu = InlineKeyboardBuilder()
    first = types.InlineKeyboardButton(text='Добавить заметку', callback_data='notes_add')
    second = types.InlineKeyboardButton(text='Смотреть заметки', callback_data='check_notes')
    menu.row(first)
    menu.row(second)
    return menu.as_markup()


async def pages_notes(user_id):
    notes = await db.check_note(user_id)
    page = await db.check_pages(user_id)
    if page < 0:
        page = len(notes) - 1
        await db.deleter(user_id, 'pages')
        await db.write_pages(user_id, page)

    elif page > len(notes) - 1:
        page = 0
        await db.deleter(user_id, 'pages')
        await db.write_pages(user_id, page)

    name_note = notes[page]['name']
    content_note = notes[page]['content']
    notesb = InlineKeyboardBuilder()
    next = types.InlineKeyboardButton(text='>>', callback_data='nav_next')
    back = types.InlineKeyboardButton(text='<<', callback_data='nav_back')

    menu = types.InlineKeyboardButton(text='В меню', callback_data='nav_menu')
    notesb.add(back)
    #if page > 0:
    #    notesb.add(back)
    count = types.InlineKeyboardButton(text=f'{page+1}/{len(notes)}', callback_data='nav_delete')
    notesb.add(count)
    #if len(notes)-1 > page:
    #    notesb.add(next)
    notesb.add(next)
    notesb.row(menu)
    return [notesb.as_markup(), name_note, content_note]





