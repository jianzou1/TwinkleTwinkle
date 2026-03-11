// gameList.js
import langManager from '/js/langManager.js';

export function gameList() {
    const GAME_CONFIG_URL = '/cfg/game_time_cfg.json';
    const SYSTEM_CONFIG_URL = '/cfg/system_cfg.json';
    const GAME_LIST_HTML_CLASS = '.game-list';

    let games = [];
    let typeNames = {};
    let qualityNames = [];

    fetchGameData();

    async function fetchGameData() {
        try {
            const [gameData, systemData] = await Promise.all([
                fetchData(GAME_CONFIG_URL),
                fetchData(SYSTEM_CONFIG_URL)
            ]);

            const systemTypeName = getSystemValue(systemData, 'typeName');
            const systemQualityName = getSystemValue(systemData, 'qualityName');

            typeNames = parseTypeNames(systemTypeName);
            qualityNames = parseQualityNames(systemQualityName);
            games = normalizeGameData(gameData);

            const stats = calculateStats(games);
            updateHtmlContent(stats);
            sortGames('按游戏评级排序');
        } catch (error) {
            console.error("读取游戏数据失败:", error.message);
        }
    }

    function getSystemValue(systemData, id) {
        if (!Array.isArray(systemData)) return '';
        return systemData.find(item => item.id === id)?.value || '';
    }

    function normalizeGameData(gameData) {
        if (Array.isArray(gameData)) {
            if (gameData[0] && typeof gameData[0] === 'object' && 'name' in gameData[0]) {
                return gameData;
            }
            if (Array.isArray(gameData[1])) return gameData[1];
        }
        return [];
    }

    async function fetchData(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`网络错误: ${response.status}`);
            return response.json();
        } catch (error) {
            console.error("数据获取失败:", error.message);
            throw error;
        }
    }

    function calculateStats(games) {
        const totalTime = games.reduce((sum, game) => sum + game.time, 0);
        const totalDays = Math.floor(totalTime / 24);
        const totalYears = (totalTime / 24 / 365).toFixed(2);
        return { totalTime, totalDays, totalYears };
    }

    function updateHtmlContent({ totalTime, totalDays, totalYears }) {
        const updateParam = (id, value) => {
            try {
                const el = document.querySelector(`[data-lang-id="${id}"]`);
                if (el) {
                    el.dataset.langParams = JSON.stringify([value]);
                    langManager.setParams(id, [value]);
                }
            } catch (e) {}
        };

        updateParam('total_time', totalTime);
        updateParam('equivalent_days', totalDays);
        updateParam('equivalent_years', totalYears);

        updateHtmlContentDetails(groupAndSortGamesByType());
    }

    document.querySelectorAll('input[name="sort-option"]').forEach((radio) => {
        radio.addEventListener('change', (event) => {
            sortGames(event.target.value);
        });
    });

    function sortGames(selectedOption) {
        let sortedGames;

        if (selectedOption === '按游戏评级排序') {
            sortedGames = sortGamesByQuality();
        } else if (selectedOption === '按游戏类型排序') {
            sortedGames = groupAndSortGamesByType();
        } else if (selectedOption === '按游戏时长排序') {
            sortedGames = [...games].sort((a, b) => b.time - a.time);
        }

        updateHtmlContentDetails(sortedGames, selectedOption);
    }

    function sortGamesByQuality() {
        const grouped = games.reduce((acc, game) => {
            const qualityKey = String(game.quality || "0");
            if (!acc[qualityKey]) acc[qualityKey] = [];
            acc[qualityKey].push(game);
            return acc;
        }, {});

        const orderedGroups = [];
        qualityNames.forEach(({ key }) => {
            if (grouped[key]) {
                orderedGroups.push({
                    key,
                    games: grouped[key].sort((a, b) => b.time - a.time)
                });
                delete grouped[key];
            }
        });

        Object.entries(grouped)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .forEach(([key, games]) => {
                orderedGroups.push({ key, games });
            });

        return orderedGroups;
    }

    function parseQualityNames(qualityNameStr) {
        if (!qualityNameStr) return [];
        return qualityNameStr.split(',')
            .map(item => {
                const [key, value] = item.trim().split(':');
                return { key: key.trim(), value: value.trim() };
            });
    }

    function generateQualityHtml(orderedGroups) {
        return orderedGroups.map(({ key, games }) => {
            const quality = qualityNames.find(q => q.key === key);
            const title = quality ? quality.value : `未定义评级（${key}）`;
            return `<h3>${title}</h3>${games.map(createGameListItem).join('')}`;
        }).join('');
    }

    function groupAndSortGamesByType() {
        const groupedGames = groupGames(games);
        Object.keys(groupedGames).forEach(type => {
            Object.keys(groupedGames[type]).forEach(seriesTag => {
                groupedGames[type][seriesTag].sort((a, b) => b.time - a.time);
            });
        });
        Object.keys(groupedGames).forEach(type => {
            const seriesTags = Object.keys(groupedGames[type]);
            seriesTags.sort((a, b) => {
                const maxTimeA = Math.max(...groupedGames[type][a].map(game => game.time));
                const maxTimeB = Math.max(...groupedGames[type][b].map(game => game.time));
                return maxTimeB - maxTimeA;
            });
            groupedGames[type] = seriesTags.reduce((acc, seriesTag) => {
                acc[seriesTag] = groupedGames[type][seriesTag];
                return acc;
            }, {});
        });
        return groupedGames;
    }

    function updateHtmlContentDetails(sortedGames, selectedOption) {
        const gameListElement = document.querySelector(GAME_LIST_HTML_CLASS);
        let html;
        if (selectedOption === '按游戏评级排序') {
            html = generateQualityHtml(sortedGames);
        } else if (selectedOption === '按游戏类型排序') {
            html = generateHtmlContent(sortedGames, typeNames);
        } else {
            html = Array.isArray(sortedGames)
                ? sortedGames.map(createGameListItem).join('')
                : '';
        }
        gameListElement.innerHTML = html || '';
        gameListElement.querySelectorAll('li').forEach((item, index) => {
            setTimeout(() => item.classList.add('flip-in'), index * 12);
        });
    }

    function parseTypeNames(typeNameStr) {
        if (!typeNameStr) return {};
        return Object.fromEntries(
            typeNameStr.split(',').map(curr => {
                const [key, value] = curr.split(':');
                return [key.trim(), value.trim()];
            })
        );
    }

    function groupGames(games) {
        return games.reduce((acc, game) => {
            const type = game.type;
            const seriesTag = game.seriesTag || "无系列";
            acc[type] = acc[type] || {};
            acc[type][seriesTag] = acc[type][seriesTag] || [];
            acc[type][seriesTag].push(game);
            return acc;
        }, {});
    }

    function generateHtmlContent(groupedGames, typeNames = {}) {
        return Object.entries(groupedGames).map(([type, series], index, types) => {
            const seriesContent = Object.entries(series).map(([seriesTag, gamesInSeries]) =>
                gamesInSeries.map(createGameListItem).join('')
            ).join('');
            return `<h3>${typeNames[type] || ''}</h3>${seriesContent}${index < types.length - 1 ? '<hr>' : ''}`;
        }).join('');
    }

    function createGameListItem(game) {
        const heart = game.isLoved ? '💜' : '';
        const sign = game.sign || '';
        const trophy = game.spacialAchievements ? '🏆' : '';
        const achievementText = game.spacialAchievements ? game.spacialAchievements.replace(/\n/g, '<br>') : '';
        const gameName = /^[A-Za-z0-9\s]+$/.test(game.name) ? `<i>${game.name}</i>` : game.name;
        const qualityClass = `quality-${game.quality || 1}`;

        return `
            <li class="${qualityClass}" ${achievementText ? 'onclick="toggleAchievement(this)"' : ''}>
                <span>
                    <strong>${gameName}</strong> ${heart} ${trophy}
                </span>
                <span>${sign} ${game.time}小时 <span class="toggle-icon">${achievementText ? '🙈' : ''}</span></span>
                <div class="achievement" style="display: none;">${achievementText}</div>
            </li>
        `;
    }

    window.toggleAchievement = function (li) {
        const achievementDiv = li.querySelector('.achievement');
        const toggleIcon = li.querySelector('.toggle-icon');

        if (!achievementDiv) return;

        const nextElement = li.nextElementSibling;
        if (nextElement && nextElement.classList.contains('achievement-info')) {
            nextElement.remove();
            toggleIcon.innerHTML = achievementDiv.innerHTML ? '🙈' : '';
        } else {
            const achievementInfoDiv = document.createElement('div');
            achievementInfoDiv.className = 'achievement-info';
            achievementInfoDiv.innerHTML = achievementDiv.innerHTML;
            li.parentNode.insertBefore(achievementInfoDiv, nextElement);
            toggleIcon.innerHTML = '👀';
        }
    }
}