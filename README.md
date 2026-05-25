# Экзопланеты

Одностраничный editorial storytelling-сайт на русском языке о подтверждённых экзопланетах по данным NASA Exoplanet Archive.

## Структура

- `index.html` — главная страница.
- `assets/css/styles.css` — стили, шрифты и адаптив.
- `assets/js/app.js` — загрузка CSV, навигация и D3-визуализации.
- `assets/js/d3.v7.min.js` — локальная копия D3.js.
- `assets/fonts/` — локальные шрифты ForestSmooth и Involve.
- `data/exoplanets_for_tableau.csv` — данные для графиков.
- `earth.png` — изображение Земли для секции масштаба.

## Локальный просмотр

Из папки проекта:

```bash
python3 -m http.server 8000
```

Открыть:

```text
http://127.0.0.1:8000/index.html
```

## Публикация на GitHub Pages

1. Создать репозиторий на GitHub.
2. Загрузить в него все файлы проекта из этой папки.
3. В настройках репозитория открыть `Settings` → `Pages`.
4. В `Build and deployment` выбрать:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. Нажать `Save`.

После публикации сайт будет доступен по адресу вида:

```text
https://USERNAME.github.io/REPOSITORY_NAME/
```

Файл `.nojekyll` нужен, чтобы GitHub Pages отдавал статические ассеты напрямую без обработки Jekyll.
