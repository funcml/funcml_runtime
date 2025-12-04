# (Fun)cml Runtime

<img src="./public/main.png" alt="funml" width="200"/>


This repository hosts the necessary runtime component for running the funcml mini framework.

## ✨ Features
- Plugins for transpiling `.fml` file and file-based routing
- Full client-side routing
- Signals and stores declaration
- REPL for live testing the transpiler binary

## 🏃‍♂️‍➡️ How to Run Locally
- Clone the repository
```
git clone https://github.com/funcml/funcml_runtime.git
```
- Install the dependencies
```
pnpm install
```
- Run the application
```
pnpm dev
```
Alternatively, you can use our image [here](https://hub.docker.com/repository/docker/kirantiloh/funcml)

## How to use?

Lihat [FML syntax guide](./docs.md) untuk pengenalan fitur dan cara menulis dalam satu file, reactivity primitive, dan routing convention.

## 📚 Lesson Learnt

#### Higher Order Function Composition & Transformation Pipelines

Untuk melakukan transpilasi dari kode funcml → kode js, kita dapat menggunakan komposisi dari berbagai higher order function yang memuat langkah-langkah transformasi kode funcml ke js

```typescript
...
import { readFMLPlugin } from "./src/plugins/readFMLFile";
import { fmlFileRoutePlugin } from "./src/plugins/fmlRoutes";

export default defineConfig({
  ...
  plugins: [readFMLPlugin(), fmlFileRoutePlugin(), ...],
  ...
});
```
Kode konfigurasi Vite menggunakan dua plugin yakni `readFMLPlugin` dan `fmlFileRoutePlugin` yang masing-masing merupakan higher-order function yang mengembalikan objek plugin berisi hook Vite. Plugin pertama menangani transpilasi file `.fml` menjadi modul JavaScript, sedangkan plugin kedua membangun sistem routing berbasis file. Komposisi keduanya dalam `plugins: [...]` menciptakan alur transformasi lengkap dari kode sumber FuncML menjadi aplikasi web yang berjalan, tanpa mutasi global atau logika imperatif yang rumit.

Transpilasi kode FuncML ke JavaScript dalam sistem ini mengikuti prinsip functional programming melalui komposisi higher-order function (HOF). Setiap tahap transformasi, mulai dari pembacaan file, transpilasi sintaksis, hingga pembentukan rute berbasis struktur direktori dipisahkan ke dalam fungsi murni yang independen, tidak memiliki efek samping, dan hanya bergantung pada input yang diberikan. Dengan menyusun pipeline transformasi sebagai komposisi HOF, sistem menjadi modular, deklaratif, dan mudah dipelihara, sesuai dengan semangat functional programming yang menekankan komposisi atas pewarisan dan kejelasan alur data.

#### Fine-Grained Reactivity

FML mengimplementasikan fine-grained reactivity menggunakan signals, yaitu pasangan fungsi [getter, setter] yang melacak dependensi secara otomatis.   
```typescript
export function createSignal<T>(
  initial: T,
): [() => T, (v: T | ((prev: T) => T)) => void] {
  let value = initial;
  const subs = new Set<Subscriber>();

  const get = () => {
    if (currentTracker) subs.add(currentTracker);
    return value;
  };

  const set = (v: T | ((prev: T) => T)) => {
    const next = typeof v === "function" ? (v as any)(value): v;
    if (Object.is(next, value)) return;
    value = next;
    for (const s of subs) schedule(s);
  };

  const removeSubscriber = (s: Subscriber) => subs.delete(s);

  (get as any).__removeSubscriber = removeSubscriber;

  return [get, set];
}
```

- `createSignal(initial)` mengembalikan getter (untuk membaca nilai) dan setter (untuk memperbarui nilai).  
- Saat getter dipanggil dalam efek (`effect`) atau komponen, sistem secara otomatis mencatat dependensi tersebut.  
- Ketika setter dipanggil, hanya efek atau tampilan yang bergantung pada sinyal tersebut yang dijalankan ulang sehingga tidak ada re-render berlebihan.

Implementasi fine-grained reactivity melalui createSignal dalam FML sangat sesuai dengan prinsip functional programming karena bersifat pure, declarative, dan komposisional. Fungsi `createSignal` adalah pure function yang menerima nilai awal dan mengembalikan sepasang fungsi (getter dan setter) tanpa efek samping pada lingkungan luar. Seluruh state dikelola secara lokal dan tertutup dalam cakupan fungsinya. Dependency tracking terjadi secara implisit melalui lexical scope dan context tracking (currentTracker), bukan melalui mutasi global atau sistem observasi imperatif. Pembaruan state melalui setter memicu re-eksekusi hanya pada bagian yang benar-benar bergantung pada nilai tersebut.

#### Approach Frontend Framework:

  1. HTML-in-JS
        - Karakteristik: Semuanya berupa function javascript
        - Kelebihan:
            1. Type safety yang seamless dan complete
            2. Tak ada context-switching antara deklarasi UI dan business logic
            3. Lebih fleksibel pattern nya karena leverage javascript
        - Kekurangan
            1. Bundle size yang lebih besar
            2. SEO dan accessibility yang buruk
  2. JS-in-HTML
      - Karakteristik: Biasanya extensi dari HTML
      - Kelebihan
          1. Pemisahan yang jelas antara deklarasi UI dan business logic
          2. Memungkinkan compile-time check
          3. Initial load dan Time-to-Interactive yang lebih cepat
      - Kekurangan
          1. Deklarasi UI yang lebih restriktif karena tidak semua expression disupport

#### Alasan Munculnya Frontend Framework:

Setelah mencoba membuat framework sendiri, terdapat beberapa pain points dalam development frontend yang telah dicoba disolve oleh existing framework, yakni:
        - DOM Manipulation
        - Persisting state across pages
        - Routing tanpa trigger page refresh
Frontend framework mengabstraksi hal tersebut sehingga developer dapat fokus dalam membangun UI yang nyaman digunakan tanpa mengurangi developer existence.

Kami menggunakan approach hybrid, menggunakan concept “everything-is-a-function” seperti React tetapi design language seperti Svelte yang memanfaatkan compiler/transpiler. Dengan approach ini kami rasa merupakan solusi yang dapat memanfaatkan keuntungan dari kedua approach dan meminimalisir kekurangan dari kedua approach



