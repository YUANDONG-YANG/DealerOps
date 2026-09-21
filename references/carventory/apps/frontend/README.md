# 🔐 String Transformation Guide

This guide outlines a series of transformations applied to the input string `register`. The steps are:

1. **Caesar Cipher** (Shift by +3)  
2. **Atbash Cipher**  
3. **Reverse the String**  
4. **Add Salt** (`S@1t`)

---

## 🔤 Original Input

```
register
```

---

## 1. 🔁 Caesar Cipher (Shift by +3)

Each letter is shifted three positions forward in the alphabet.

| Original | r | e | g | i | s | t | e | r |
|----------|---|---|---|---|---|---|---|---|
| Caesar+3 | u | h | j | l | v | w | h | u |

**Result:**  
```
uhjlvwhu
```

---

## 2. 🔄 Atbash Cipher

Each letter is replaced with its "mirror" in the alphabet (`a ↔ z`, `b ↔ y`, ..., `z ↔ a`).

| Input    | u | h | j | l | v | w | h | u |
|----------|---|---|---|---|---|---|---|---|
| Atbash   | f | s | q | o | e | d | s | f |

**Result:**  
```
fsqoedsf
```

---

## 3. 🔃 Reverse the String

Reverse the result from the Atbash step:

**Reversed:**  
```
fsdeoqsf
```

---

## 4. 🧂 Add Salt

To increase unpredictability, a salt string is appended. In this case, the salt is:

```
S@1t
```

**Final Output:**  
```
fsdeoqsfS@1t
```

---

## ✅ Summary

| Step            | Output          |
|-----------------|-----------------|
| Original        | register         |
| Caesar +3       | uhjlvwhu         |
| Atbash          | fsqoedsf         |
| Reversed        | fsdeoqsf         |
| Final (Salted)  | fsdeoqsfS@1t     |

---

## 🛡️ Security Note

This method is **not cryptographically secure**. However, combining classical ciphers (Caesar + Atbash), string reversal, and salting provides basic **obfuscation**, which can be useful for lightweight encoding or casual use cases.

---