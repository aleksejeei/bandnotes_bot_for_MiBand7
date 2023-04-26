import os
import shutil
#import db
import zipfile
def copy_files(user_id, content):
    shutil.copytree('example', f'{user_id}', symlinks=False, ignore=None, ignore_dangling_symlinks=False)

    content = str(content).replace("'", '"')
    if content != '[]':
        write = open(f'{user_id}/assets/notes.json', 'w')
        write.write(content)
        write.close()
    path = f'{user_id}_notes'
    shutil.make_archive(path, 'zip', str(user_id))
    os.rename(f'{user_id}_notes.zip', f'{user_id}_notes.bin')


def rm_files(user_id):
    shutil.rmtree(f'{user_id}')
    os.remove(f'{user_id}_notes.bin')

