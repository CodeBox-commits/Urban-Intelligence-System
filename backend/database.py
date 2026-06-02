from __future__ import annotations

import sqlite3
from contextlib import contextmanager

from .config import DATABASE_PATH


def dict_factory(cursor: sqlite3.Cursor, row: tuple) -> dict:
    return {column[0]: row[index] for index, column in enumerate(cursor.description)}


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
    connection.row_factory = dict_factory
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


@contextmanager
def db_cursor():
    connection = get_connection()
    cursor = connection.cursor()

    try:
        yield cursor
        connection.commit()
    finally:
        cursor.close()
        connection.close()

