# Panduan Sintaks Functional Markup Language

Functional Markup Language (FML) adalah DSL single-file yang memungkinkan Anda menulis antarmuka secara deklaratif mirip HTML sambil tetap memanfaatkan JavaScript murni untuk logika stateful. Plugin Vite di repo ini mentranspilasi setiap file `.fml` menjadi fungsi standar yang dirender menggunakan runtime dari `@lib`, sehingga semua kemampuan JavaScript tetap tersedia dengan ergonomi markup yang lebih ramah.

## Anatomi File

File `.fml` dapat memuat dua blok tingkat atas:

```fml
script (
  // opsional: import nilai dan deklarasi logika
)

ComponentName => (
  // wajib: antarmuka deklaratif yang dikembalikan komponen
)
```

- `script (...)` bersifat opsional. Bagian ini dieksekusi sekali per modul saat transpilasi dan merupakan tempat mengimpor helper, mendefinisikan signal, store, ataupun fungsi yang dipakai template.
- `ComponentName => (...)` bersifat wajib. Nama tersebut menjadi nama komponen yang diekspor (router otomatis memetakannya). Isi di dalam tanda kurung adalah pohon elemen yang sintaksnya menyerupai HTML.

Saat plugin Vite memuat file, ia membungkus hasil transpilasi menjadi seperti ini (disederhanakan):

```ts
import { f } from "@lib";
// + import apa pun dari blok script
export default function ComponentNameComponent() {
  // isi script
  return ComponentName();
}
```

## Dasar Blok Script

Di dalam `script (...)` Anda menulis JavaScript/TypeScript biasa. Helper umum dari `@lib` antara lain:

- `createSignal(initialValue)` → signal granular berupa pasangan `[getter, setter]`.
- `effect(fn)` → menjalankan `fn` setiap kali signal yang dibaca di dalamnya berubah.
- `createMemo(fn)` → menyimpan nilai turunan agar tidak dihitung ulang sembarang.
- `navigateTo(path)` dan `replaceWith(path)` dari router `@lib` untuk navigasi tanpa reload.
- Store aplikasi (mis. `authStore`, `themeStore`) dapat diimpor via alias seperti `@/stores`.

Contoh (dari `src/routes/todo.fml`):

```fml
script (
  import { createSignal, effect } from "@lib";

  const [todos, setTodos] = createSignal([]);

  effect(() => {
    console.log(todos());
  });

  function addTodos(e) {
    e.preventDefault();
    const content = e.target.content.value;
    setTodos((prev) => [content, ...prev]);
    e.target.reset();
  }
)
```

Apa pun yang didefinisikan di sini dapat digunakan langsung oleh blok markup di bawahnya.

## Deklarasi Elemen

Elemen mengikuti pola yang konsisten:

```
tag attribute="value" attribute=[expression] (
  // children
)
```

- Tag dapat berupa elemen HTML native (`div`, `form`, `button`, dll.) atau pemanggilan komponen PascalCase.
- Setiap elemen diakhiri blok anak `(...)`. Gunakan `()` jika tidak ada *children* (misal `input`, `img`).
- Atribut tanpa kurung siku dianggap string literal. Bungkus dalam `[...]` untuk mengevaluasi ekspresi saat runtime.
- Event handler memakai penamaan DOM standar: `onclick`, `oninput`, `onsubmit`, dll. Kaitkan dengan tanda kurung siku, misal `onsubmit=[handleLogin]`.
- Atribut boolean (seperti `required`) bisa ditulis `required="true"` atau diikat ke ekspresi.

## Komposisi Elemen dengan `$`

Gunakan `$` untuk mengkomposisi kan elemen dengan elemen lain:

```fml
p class="text-lg" $ "Teks biasa"
h1 class="font-bold" $ [email()]
h1 class="text-lg" $ a href="/" $ "To index"
```

## Dynamic Block dan Flow Control

Ekspresi bebas dapat ditempatkan di mana saja dengan membungkusnya menggunakan kurung siku. Untuk bagian reaktif, letakkan ekspresi di dalam fungsi sehingga FML dapat menjalankannya ulang ketika dependensi berubah:

```fml
ul (
  [() =>
    todos().length > 0
      ? todos().map((todo) => f("li", {}, todo))
      : "Tidak ada todo..."
  ]
)
```

Pola umum:

- `[expression]` → dievaluasi sekali (cocok untuk konstanta atau data non-reaktif).
- `[() => expression]` → evaluasi tangguh yang akan dijalankan ulang saat signal di dalamnya berubah.
- Gunakan helper rendah-level `f(tag, props?, ...children)` ketika perlu membuat anak secara imperatif, misalnya saat melakukan `map`.

## Guard

Guard juga bisa digunakan untuk me-render suatu elemen yang memenuhi kondisi tertentu dengan menggunakan `@if`, `@elif`, dan `@else`.

```fml
GuardDemo => (
  div (
    @if a > 3 then
        (h1 $ h2 (
            "Hellow",
            iframe
        ))
    @elif b then
       (h1 $ "Hi")
    @else then
        (h1 $ "Howdy!")
    @end if
  )
)

```

## Mengikat Atribut

Setiap atribut dapat dibuat reaktif:

```fml
input
  id="email-address"
  value=[email()]
  oninput=[(e) => setEmail(e.target.value)]
()

span class=[() => errorBadge() ? "bg-red-100" : "hidden"] ()
```

- Nilai primitif (`string`, `number`, `boolean`) bisa langsung dipakai.
- Event menerima fungsi penuh: `onclick=[handleClick]`.
- Karena atribut pada akhirnya hanya props, Anda juga bisa melakukan spread objek di dalam ekspresi (`{...props}`) jika memang diperlukan.

## List Comprehension

Untuk me-render elemen dalam suatu list dengan ringkas, bisa menggunakan list comprehension dengan notasi berikut.

```fml
A => (ul $ @[
    li x=[1] $ [title], 
    {title, desc} <- todos(), 
    title.isLower()
])
```

## Primitif Reaktivitas

### Signal

```ts
const [value, setValue] = createSignal(initial);
value(); // membaca nilai (sekalian mencatat dependensi)
setValue(next); // memperbarui dan memberi tahu subscriber
```

- Membaca signal di markup atau `effect` otomatis mendaftarkan dependensi tersebut.
- Hanya node DOM yang menggunakan signal itu yang diperbarui, sehingga update tetap granular.

### Efek

```ts
effect(() => {
  if (!authStore.select((s) => s.isAuthenticated)()) {
    replaceWith("/profile/login");
  }
});
```

- Cocok untuk kerja asinkron, API imperatif DOM, atau navigasi berdasarkan perubahan signal/store.
- Kembalikan fungsi cleanup bila perlu.

### Memo

Gunakan `createMemo(() => compute())` untuk nilai turunan yang sering diakses. Belum banyak dipakai di contoh route saat ini, namun tersedia dari `@lib`.

## Store dan Selector

Store yang dibuat dengan `createStore` menyediakan helper `select` yang mengembalikan accessor:

```ts
const theme = themeStore.select((state) => state.mode);
const email = authStore.select((state) => state.email);
```

- Panggil accessor seperti signal (`theme()` atau `email()`).
- Karena selector bersifat reaktif, menggunakannya di `effect` ataupun markup akan menjaga sinkronisasi otomatis.

## Helper Navigation

Routing sisi klien bersifat file-based:

- Letakkan file `.fml` di `src/routes`. Struktur folder menentukan URL (`src/routes/profile/login.fml` → `/profile/login`).
- `src/routes/index.fml` dipetakan ke `/` dan `src/routes/404.fml` untuk halaman tidak ditemukan.

Di dalam script Anda bisa mengimpor helper router dari `@lib`:

```ts
import { navigateTo, replaceWith } from "@lib";

function handleLoginSuccess() {
  navigateTo("/todo");
}

function guard() {
  try {
    checkAuth();
  } catch {
    replaceWith("/profile/login");
  }
}
```

Gunakan `navigateTo` untuk mendorong entri riwayat baru dan `replaceWith` untuk mengganti entri saat ini (berguna untuk redirect otentikasi).

## Menggabungkan Semuanya

```fml
script (
  import { createSignal, effect, navigateTo } from "@lib";
  import { authStore, login } from "@/stores";

  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const error = authStore.select((s) => s.error);

  function handleSubmit(e) {
    e.preventDefault();
    login(email(), password())
      .then(() => navigateTo("/todo"));
  }
)

Login => (
  main class="min-h-screen flex items-center justify-center" (
    form class="space-y-4" onsubmit=[handleSubmit] (
      input
        type="email"
        placeholder="Email"
        value=[email()]
        oninput=[(e) => setEmail(e.target.value)]
      (),
      input
        type="password"
        placeholder="Password"
        value=[password()]
        oninput=[(e) => setPassword(e.target.value)]
      (),
      [() => error() && f("p", { class: "text-red-500" }, error())],
      button type="submit" class="btn-primary" $ "Masuk"
    )
  )
)
```

Contoh di atas menggabungkan import, signal, event handler, render kondisional, dan navigasi hanya dalam ~40 baris.

## Tips & Best Practice

- **Letakkan logika di `script`**: Definisikan handler, efek, dan perhitungan sekali saja, biarkan markup tetap deklaratif.
- **Utamakan selector untuk store**: `store.select((state) => state.slice)` memberi akses seperti signal yang otomatis bereaksi pada perubahan.
- **Bungkus bagian dinamis dalam fungsi**: Gunakan `[() => ...]` saat merujuk signal supaya FML dapat menjalankannya ulang.
- **Bebas gunakan kelas Tailwind/utilitas**: file `.fml` meneruskan atribut langsung ke DOM sehingga strategi CSS yang sudah ada tetap berlaku.
- **Debug dengan `console.log`**: Log di `script` atau handler akan ikut ditranspilasi ke JS biasa sehingga bisa diperiksa lewat devtools.

Dengan primitif di atas Anda dapat membangun halaman reaktif sepenuhnya menggunakan markup ringkas dan mudah dibaca, sementara runtime menangani detail reaktivitas serta routing untuk Anda.
