# Funcml Runtime

![Funcml logo (Haskell Curry)](./public/main.png)

This repository hosts the necessary runtime component for running the funcml mini framework.

## ✨ Features
- Plugins for transpiling `.fml` file and file-based routing
- Full client side routing
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

## How to use?

Lihat [FML syntax guide](./docs.md) untuk pengenalan fitur dan cara menulis dalam satu file, reactivity primitive, dan routing convention.

## 📚 Lesson Learnt

#### Higher Order Function Composition & Transformation Pipelines

Untuk melakukan transpilasi dari kode funcml → kode js, kita dapat menggunakan komposisi dari berbagai higher order function yang memuat langkah-langkah transformasi kode funcml ke js

#### Fine-Grained Reactivity

FML mengimplementasikan fine-grained reactivity menggunakan signals, yaitu pasangan fungsi [getter, setter] yang melacak dependensi secara otomatis.   

- `createSignal(initial)` mengembalikan getter (untuk membaca nilai) dan setter (untuk memperbarui nilai).  
- Saat getter dipanggil dalam efek (effect) atau komponen, sistem secara otomatis mencatat dependensi tersebut.  
- Ketika setter dipanggil, hanya efek atau tampilan yang bergantung pada sinyal tersebut yang dijalankan ulang — tidak ada re-render berlebihan.


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



