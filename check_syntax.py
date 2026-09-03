import py_compile
py_compile.compile('database.py', doraise=True)
py_compile.compile('server.py', doraise=True)
py_compile.compile('app.py', doraise=True)
print('Syntax OK')
