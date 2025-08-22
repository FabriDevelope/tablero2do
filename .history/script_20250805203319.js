// Mapeo de comandos a binario
const COMMAND_MAP = {
    'mover(der)': '10010011',
    'mover(izq)': '10010010',
    'mover(arr)': '10010000',
    'mover(abj)': '10010001',
    'esperar': '00000000',
    'hacer': '1010', // Se añade el valor después
    'finhacer': '11111111',
    'call': '110000', // Se añade el valor después
    'return': '11001111',
    'agarrar()': '10101010',
    'saltar(der)': '10011011',
    'saltar(izq)': '10011010',
    'saltar(arr)': '10011000',
    'saltar(abj)': '10011001'
};

// Variables globales
let selectedCharacter = null;
let draggedElement = null;
let currentBoardSize = 10;
let isExecuting = false;
let executionSpeed = 500; // Velocidad predeterminada (Normal)
let callStack = []; // Stack para llamadas a subrutinas
let backgroundElements = {}; // Almacena elementos de fondo
let characterElements = {}; // Almacena personajes colocados

// Variables para modo juegos
let lives = 3;
let jumps = 5;
let doorEntrada = null;
let doorSalida = null;

// Corregir la generación del tablero
function generateBoard(size) {
    const board = document.getElementById('board');
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    currentBoardSize = size;
    backgroundElements = {};
    characterElements = {};
    
    // Reiniciar contadores en modo juegos
    if (MODE === 'juegos') {
        lives = 3;
        jumps = 5;
        updateCounters();
    }
    
    for (let i = 0; i < size * size; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = Math.floor(i / size);
        cell.dataset.col = i % size;
        cell.dataset.id = `${cell.dataset.row}-${cell.dataset.col}`;
        
        // Contenedor para elementos (IMPORTANTE: esto faltaba en el modo juegos)
        const elementContainer = document.createElement('div');
        elementContainer.className = 'element-content';
        cell.appendChild(elementContainer);
        
        board.appendChild(cell);
    }
    
    // Actualizar estado de selección
    updateSelectionInfo();
}

// Configurar eventos del tablero
function setupBoardEvents() {
    const cells = document.querySelectorAll('.cell');
    
    // Eventos de drag and drop para elementos del sidebar
    document.querySelectorAll('.sidebar .element').forEach(element => {
        element.addEventListener('dragstart', handleDragStart);
        element.addEventListener('dragend', handleDragEnd);
    });
    
    cells.forEach(cell => {
        cell.addEventListener('dragover', handleDragOver);
        cell.addEventListener('dragenter', handleDragEnter);
        cell.addEventListener('dragleave', handleDragLeave);
        cell.addEventListener('drop', handleDrop);
        cell.addEventListener('click', handleCellClick);
        cell.addEventListener('contextmenu', handleCellRightClick);
    });
    
    // Evento para cambiar tamaño del tablero
    document.getElementById('boardSize').addEventListener('change', function() {
        const size = parseInt(this.value);
        generateBoard(size);
        setupBoardEvents();
    });
    
    // Evento para cambiar velocidad
    const speedControl = document.getElementById('speed');
    if (speedControl) {
        speedControl.addEventListener('input', function() {
            executionSpeed = parseInt(this.value);
            updateSpeedLabel();
        });
        updateSpeedLabel();
    }
}

function updateSpeedLabel() {
    const speedValue = document.getElementById('speedValue');
    if (!speedValue) return;
    
    if (executionSpeed <= 200) speedValue.textContent = 'Muy rápido';
    else if (executionSpeed <= 400) speedValue.textContent = 'Rápido';
    else if (executionSpeed <= 600) speedValue.textContent = 'Normal';
    else if (executionSpeed <= 800) speedValue.textContent = 'Lento';
    else speedValue.textContent = 'Muy lento';
}

// Actualizar contadores en modo juegos
function updateCounters() {
    if (MODE === 'juegos') {
        document.querySelector('#livesCounter span').textContent = lives;
        document.querySelector('#jumpsCounter span').textContent = jumps;
    }
}

// Actualizar información de selección
function updateSelectionInfo() {
    const infoElement = document.getElementById('selectedCharacter');
    if (infoElement) {
        infoElement.textContent = selectedCharacter 
            ? selectedCharacter.querySelector('.character-element')?.textContent || 'Personaje'
            : 'Ninguno';
    }
}

// Eventos de drag and drop
function handleDragStart(e) {
    draggedElement = this;
    e.dataTransfer.setData('text/plain', this.dataset.emoji);
    this.classList.add('dragging');
    setTimeout(() => this.style.opacity = '0.5', 0);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    this.style.opacity = '1';
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDragEnter(e) {
    e.preventDefault();
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    
    const emoji = draggedElement.dataset.emoji;
    const type = draggedElement.dataset.type;
    const id = draggedElement.dataset.id;
    const cellId = this.dataset.id;
    
    // Si es un personaje
    if (type === 'character') {
        // Verificar si ya existe un personaje con este ID
        if (characterElements[id]) {
            showError(`Ya existe un ${id} en el tablero`);
            return;
        }
        
        // Crear elemento de personaje
        const character = document.createElement('div');
        character.className = 'character-element';
        character.textContent = emoji;
        character.dataset.id = id;
        character.draggable = true;
        
        // Agregar eventos para mover el personaje
        character.addEventListener('dragstart', handleCharacterDragStart);
        character.addEventListener('dragend', handleCharacterDragEnd);
        
        // Agregar a la celda
        this.querySelector('.element-content').appendChild(character);
        
        // Seleccionar este personaje
        if (selectedCharacter) {
            selectedCharacter.classList.remove('selected');
        }
        this.classList.add('selected');
        selectedCharacter = this;
        
        // Registrar el personaje
        characterElements[id] = this;
        
        // Actualizar información
        updateSelectionInfo();
        document.getElementById('runBtn').disabled = false;
    } 
    // Si es un elemento de fondo
    else {
        // Si ya hay un elemento de fondo, reemplazarlo
        if (backgroundElements[cellId]) {
            this.querySelector('.background-element').textContent = emoji;
        } else {
            // Crear elemento de fondo
            const bgElement = document.createElement('div');
            bgElement.className = 'background-element';
            bgElement.textContent = emoji;
            
            // Agregar a la celda
            this.querySelector('.element-content').appendChild(bgElement);
        }
        
        // Guardar elemento de fondo
        backgroundElements[cellId] = {
            emoji: emoji,
            type: type,
            id: id
        };
        
        // Guardar ubicación de puertas en modo juegos
        if (MODE === 'juegos') {
            if (type === 'door' && id === 'entrada') {
                doorEntrada = this;
            } else if (type === 'door' && id === 'salida') {
                doorSalida = this;
            }
        }
    }
    
    this.classList.add('has-element');
}

function handleCharacterDragStart(e) {
    // Guardar la celda padre para luego remover el personaje
    draggedElement = this.parentElement.parentElement;
    draggedElementCharacter = this;
    e.dataTransfer.setData('text/plain', this.textContent);
    this.style.opacity = '0.5';
}

function handleCharacterDragEnd(e) {
    this.style.opacity = '1';
}

function handleCellClick(e) {
    if (e.button !== 0) return; // Solo clic izquierdo
    
    const cell = this;
    const character = cell.querySelector('.character-element');
    
    // Si hay un personaje en la celda, seleccionarlo
    if (character) {
        // Deseleccionar el anterior
        if (selectedCharacter) {
            selectedCharacter.classList.remove('selected');
        }
        
        // Seleccionar el nuevo
        cell.classList.add('selected');
        selectedCharacter = cell;
        updateSelectionInfo();
        document.getElementById('runBtn').disabled = false;
    }
}

function handleCellRightClick(e) {
    e.preventDefault();
    
    const cell = this;
    const cellId = cell.dataset.id;
    const character = cell.querySelector('.character-element');
    
    // Si hay un personaje, eliminarlo
    if (character) {
        // Eliminar del registro
        delete characterElements[character.dataset.id];
        
        character.remove();
        
        // Si era el personaje seleccionado, deseleccionar
        if (cell === selectedCharacter) {
            cell.classList.remove('selected');
            selectedCharacter = null;
            updateSelectionInfo();
            document.getElementById('runBtn').disabled = true;
        }
    }
    // Si no hay personaje pero hay fondo, eliminar fondo
    else if (backgroundElements[cellId]) {
        const bgElement = cell.querySelector('.background-element');
        if (bgElement) {
            bgElement.remove();
        }
        delete backgroundElements[cellId];
        
        // Si era una puerta, limpiar referencia
        if (MODE === 'juegos') {
            if (doorEntrada === cell) {
                doorEntrada = null;
            } else if (doorSalida === cell) {
                doorSalida = null;
            }
        }
    }
    
    // Si no quedan elementos, quitar clase
    if (!cell.querySelector('.background-element') && !cell.querySelector('.character-element')) {
        cell.classList.remove('has-element');
    }
}

// Configurar eventos de programación
function setupProgrammingEvents() {
    // Eventos para convertir a binario en tiempo real
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        textarea.addEventListener('input', convertToBinary);
    });
    
    // Botón de ayuda
    const helpBtn = document.getElementById('helpBtn');
    helpBtn.addEventListener('click', openHelpModal);
    
    // Botón de cerrar modal
    const closeBtn = document.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeHelpModal);
    }
    
    // Cerrar modal haciendo clic fuera
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('helpModal');
        if (event.target === modal) {
            closeHelpModal();
        }
    });
    
    // Botón de ejecutar
    const runBtn = document.getElementById('runBtn');
    runBtn.addEventListener('click', executeCode);
    
    // Convertir inicialmente
    convertToBinary();
}

function convertToBinary() {
    const mainCode = document.getElementById('mainCode').value.trim();
    const sub1 = document.getElementById('sub1').value.trim();
    const sub2 = document.getElementById('sub2').value.trim();
    const sub3 = document.getElementById('sub3').value.trim();
    
    if (!mainCode && !sub1 && !sub2 && !sub3) {
        document.getElementById('binaryCode').textContent = 'Escribe código para ver su equivalente binario';
        return;
    }
    
    let binaryOutput = '';
    
    if (mainCode) {
        binaryOutput += `Principal: ${convertCodeBlock(mainCode)}\n`;
    }
    if (sub1) {
        binaryOutput += `Sub1: ${convertCodeBlock(sub1)}\n`;
    }
    if (sub2) {
        binaryOutput += `Sub2: ${convertCodeBlock(sub2)}\n`;
    }
    if (sub3) {
        binaryOutput += `Sub3: ${convertCodeBlock(sub3)}\n`;
    }
    
    document.getElementById('binaryCode').textContent = binaryOutput;
}


function convertCodeBlock(code) {
    if (!code.trim()) return '';  // <-- Esta línea es nueva
    
    const lines = code.split('\n');
    const binaryLines = [];
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        // Buscar comandos conocidos
        let binaryCommand = null;
        
        // Comandos sin parámetros
        if (COMMAND_MAP[trimmedLine]) {
            binaryCommand = COMMAND_MAP[trimmedLine];
        } 
        // Comandos con parámetros (hacer y call)
        else if (trimmedLine.startsWith('hacer(')) {
            const n = trimmedLine.match(/hacer\((\d+)\)/)?.[1];
            if (n && n >= 1 && n <= 15) {
                const binN = parseInt(n).toString(2).padStart(4, '0');
                binaryCommand = COMMAND_MAP['hacer'] + binN;
            }
        } else if (trimmedLine.startsWith('call(')) {
            const n = trimmedLine.match(/call\((\d+)\)/)?.[1];
            if (n && n >= 1 && n <= 3) {
                const binN = parseInt(n).toString(2).padStart(2, '0');
                binaryCommand = COMMAND_MAP['call'] + binN;
            }
        } 
        // Comando esperar con parámetro
        else if (trimmedLine.startsWith('esperar(')) {
            binaryCommand = COMMAND_MAP['esperar'];
        }
        
        if (binaryCommand) {
            binaryLines.push(binaryCommand);
        } else {
            binaryLines.push('ERROR: Comando no reconocido');
        }
    }
    
    return binaryLines.join(' ');
}


// Modal de ayuda
function openHelpModal() {
    const modal = document.getElementById('helpModal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeHelpModal() {
    const modal = document.getElementById('helpModal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
}

// Verificar si está al lado de una puerta
function isNextToDoor(row, col, doorType) {
    const directions = [
        {r: row-1, c: col}, // arriba
        {r: row+1, c: col}, // abajo
        {r: row, c: col-1}, // izquierda
        {r: row, c: col+1}  // derecha
    ];
    
    for (const dir of directions) {
        const cellId = `${dir.r}-${dir.c}`;
        const bgElement = backgroundElements[cellId];
        if (bgElement && bgElement.type === 'door' && bgElement.id === doorType) {
            return true;
        }
    }
    return false;
}

// Verificar serpientes adyacentes
function checkAdjacentSnakes(row, col) {
    const directions = [
        {r: row-1, c: col}, // arriba
        {r: row+1, c: col}, // abajo
        {r: row, c: col-1}, // izquierda
        {r: row, c: col+1}  // derecha
    ];
    
    for (const dir of directions) {
        const cellId = `${dir.r}-${dir.c}`;
        const bgElement = backgroundElements[cellId];
        if (bgElement && bgElement.type === 'element' && bgElement.id === 'serpiente') {
            return true;
        }
    }
    return false;
}

// Ejecutar código
async function executeCode() {
    if (isExecuting) return;
    
    if (!selectedCharacter) {
        showError('Error: ¡Primero selecciona un personaje en el tablero!');
        return;
    }
    
    // En modo juegos: verificar posición inicial
    if (MODE === 'juegos') {
        const row = parseInt(selectedCharacter.dataset.row);
        const col = parseInt(selectedCharacter.dataset.col);
        
        if (!isNextToDoor(row, col, 'entrada')) {
            showError('Error: ¡El personaje debe estar al lado de la puerta de entrada!');
            return;
        }
    }
    
    const mainCode = document.getElementById('mainCode').value;
    if (!mainCode.trim()) {
        showError('Error: ¡El código principal está vacío!');
        return;
    }
    
    const runBtn = document.getElementById('runBtn');
    runBtn.textContent = 'Ejecutando...';
    runBtn.disabled = true;
    isExecuting = true;
    callStack = []; // Reset del stack
    
    // Reiniciar contadores en modo juegos
    if (MODE === 'juegos') {
        lives = 3;
        jumps = 5;
        updateCounters();
    }
    
    // Ejecutar código principal
    await executeCodeBlock(mainCode, true);
    
    // En modo juegos: verificar posición final
    if (MODE === 'juegos') {
        const row = parseInt(selectedCharacter.dataset.row);
        const col = parseInt(selectedCharacter.dataset.col);
        
        if (!isNextToDoor(row, col, 'salida')) {
            showError('¡No has llegado a la salida!');
        } else {
            showInfo('¡Felicidades! Has completado el nivel.');
        }
    }
    
    runBtn.textContent = 'Ejecutar código';
    runBtn.disabled = false;
    isExecuting = false;
}

// Función para ejecutar un bloque de código
async function executeCodeBlock(code, isMain = false) {
    if (!code.trim()) return true;  // <-- Validación para evitar procesar código vacío
    
    const lines = code.split('\n').filter(line => line.trim());
    let returnCalled = false;
    
    for (let i = 0; i < lines.length; i++) {
        const command = lines[i].trim();
        
        // Si se encontró un return, salir de la subrutina
        if (returnCalled && !isMain) {
            return true;
        }
        
        // Manejar llamadas a subrutinas
        if (command.startsWith('call(')) {
            const n = command.match(/call\((\d+)\)/)?.[1];
            if (n && n >= 1 && n <= 3) {
                const subCode = document.getElementById(`sub${n}`).value;
                if (subCode.trim()) {
                    // Guardar la posición actual
                    callStack.push({
                        line: i,
                        code: code,
                        isMain: isMain
                    });
                    
                    // Ejecutar subrutina
                    await executeCodeBlock(subCode);
                    
                    // Continuar desde la siguiente línea
                    i = callStack.pop().line;
                }
            }
        }
        // Manejar return
        else if (command === 'return') {
            if (!isMain) {
                returnCalled = true;
                continue;
            }
        }
        // Ejecutar otros comandos
        else {
            const success = await executeCommand(command);
            if (!success) {
                // Si hay un error, detener la ejecución
                return false;
            }
        }
        
        // Esperar según la velocidad configurada
        await new Promise(resolve => setTimeout(resolve, executionSpeed));
    }
    
    return true;
}


// Función para ejecutar un comando
async function executeCommand(command) {
    if (!selectedCharacter) return false;

    const board = document.getElementById('board');
    const row = parseInt(selectedCharacter.dataset.row);
    const col = parseInt(selectedCharacter.dataset.col);
    const character = selectedCharacter.querySelector('.character-element');
    
    let newRow = row;
    let newCol = col;
    let success = true;
    let animationClass = '';
    let isJump = false;

    // Interpretar el comando
    switch (command) {
        case 'mover(der)':
            newCol = col + 1;
            animationClass = 'moveRight';
            break;
        case 'mover(izq)':
            newCol = col - 1;
            animationClass = 'moveLeft';
            break;
        case 'mover(arr)':
            newRow = row - 1;
            animationClass = 'moveUp';
            break;
        case 'mover(abj)':
            newRow = row + 1;
            animationClass = 'moveDown';
            break;
        case 'saltar(der)':
            if (jumps <= 0) {
                showError("No tienes saltos disponibles");
                return false;
            }
            newCol = col + 2;
            animationClass = 'jump';
            isJump = true;
            break;
        case 'saltar(izq)':
            if (jumps <= 0) {
                showError("No tienes saltos disponibles");
                return false;
            }
            newCol = col - 2;
            animationClass = 'jump';
            isJump = true;
            break;
        case 'saltar(arr)':
            if (jumps <= 0) {
                showError("No tienes saltos disponibles");
                return false;
            }
            newRow = row - 2;
            animationClass = 'jump';
            isJump = true;
            break;
        case 'saltar(abj)':
            if (jumps <= 0) {
                showError("No tienes saltos disponibles");
                return false;
            }
            newRow = row + 2;
            animationClass = 'jump';
            isJump = true;
            break;
        case 'agarrar()':
            character.style.animation = 'grab 0.5s ease';
            setTimeout(() => {
                character.style.animation = '';
            }, 500);
            break;
        case 'esperar(n)':
            // Espera ya está implementada con el timeout entre comandos
            break;
        default:
            if (command.startsWith('call(')) {
                // Ya manejado en executeCodeBlock
            } else if (command.startsWith('hacer(')) {
                showInfo(`Haciendo acción: ${command}`);
            } else if (command === 'finhacer') {
                // No hacer nada
            } else {
                showError(`Comando no reconocido: ${command}`);
                success = false;
            }
    }
    
    // Consumir salto si se usó
    if (isJump) {
        jumps--;
        updateCounters();
    }
    
    // Mover el personaje si es un comando de movimiento
    if (animationClass) {
        // Validar si el movimiento es posible
        if (newRow < 0 || newRow >= currentBoardSize || newCol < 0 || newCol >= currentBoardSize) {
            showError('Error: ¡Movimiento fuera de los límites del tablero!');
            return false;
        }
        
        const newCell = board.querySelector(`.cell[data-row="${newRow}"][data-col="${newCol}"]`);
        if (newCell) {
            // Animación de movimiento
            character.style.animation = `${animationClass} ${executionSpeed/1000}s ease`;
            
            await new Promise(resolve => setTimeout(resolve, executionSpeed));
            
            // Mover a la nueva celda
            const currentBg = selectedCharacter.querySelector('.background-element')?.cloneNode(true);
            selectedCharacter.querySelector('.element-content').innerHTML = '';
            if (currentBg) {
                selectedCharacter.querySelector('.element-content').appendChild(currentBg);
            }
            
            // Actualizar posición
            selectedCharacter.classList.remove('selected');
            selectedCharacter.classList.remove('has-element');
            if (!currentBg) {
                selectedCharacter.classList.remove('has-element');
            }
            
            newCell.querySelector('.element-content').appendChild(character);
            newCell.classList.add('selected');
            newCell.classList.add('has-element');
            selectedCharacter = newCell;
            
            // Actualizar posición del personaje
            characterElements[character.dataset.id] = newCell;
            
            // Restablecer animación
            character.style.animation = '';
            
            // Verificar serpientes adyacentes en modo juegos
            if (MODE === 'juegos' && checkAdjacentSnakes(newRow, newCol)) {
                lives--;
                updateCounters();
                showWarning("¡Cuidado! Hay una serpiente cerca. Pierdes 1 vida.");
                
                if (lives <= 0) {
                    showError("¡Juego terminado! Te quedaste sin vidas.");
                    return false;
                }
            }
            
            // Verificar elementos recolectables
            const cellId = `${newRow}-${newCol}`;
            const bgElement = backgroundElements[cellId];
            if (bgElement) {
                if (bgElement.id === 'vida') {
                    lives = Math.min(lives + 1, 5);
                    delete backgroundElements[cellId];
                    newCell.querySelector('.background-element').remove();
                    showInfo("¡Vida extra! +1 vida");
                    updateCounters();
                }
                else if (bgElement.id === 'resorte') {
                    jumps = Math.min(jumps + 2, 10);
                    delete backgroundElements[cellId];
                    newCell.querySelector('.background-element').remove();
                    showInfo("¡Resorte recolectado! +2 saltos");
                    updateCounters();
                }
            }
        } else {
            showError('Movimiento inválido');
            success = false;
        }
    }
    
    return success;
}

// Mostrar mensajes de error
function showError(message) {
    const binaryOutput = document.getElementById('binaryCode');
    binaryOutput.textContent = message;
    binaryOutput.style.color = 'var(--error)';
    binaryOutput.style.fontWeight = 'bold';
    setTimeout(() => {
        convertToBinary();
        binaryOutput.style.color = '';
        binaryOutput.style.fontWeight = '';
    }, 3000);
}

function showWarning(message) {
    const binaryOutput = document.getElementById('binaryCode');
    const originalContent = binaryOutput.textContent;
    binaryOutput.textContent = message;
    binaryOutput.style.color = 'var(--warning)';
    setTimeout(() => {
        binaryOutput.textContent = originalContent;
        binaryOutput.style.color = '';
    }, 2000);
}

function showInfo(message) {
    const binaryOutput = document.getElementById('binaryCode');
    const originalContent = binaryOutput.textContent;
    binaryOutput.textContent = message;
    binaryOutput.style.color = 'var(--success)';
    setTimeout(() => {
        binaryOutput.textContent = originalContent;
        binaryOutput.style.color = '';
    }, 2000);
}

// Cambiar tema claro/oscuro
document.querySelector('.theme-toggle').addEventListener('click', function() {
  document.body.classList.toggle('light-theme');
  this.querySelector('i').classList.toggle('fa-sun');
  this.querySelector('i').classList.toggle('fa-moon');
});