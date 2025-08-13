// File Explorer JavaScript

class FileExplorer {
    constructor() {
        this.currentPath = '';
        this.navigationHistory = [''];
        this.historyIndex = 0;
        this.selectedItems = new Set();
        this.viewMode = 'grid';
        this.sortBy = 'name';
        this.sortOrder = 'asc';
        this.fileTypeFilter = '';
        this.excludedFiles = ['recent_updates.json']; // Files to exclude from listing
        
        this.fileStructure = {};
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        await this.discoverFileStructure();
        this.navigateToPath('');
        this.updateUI();
    }
    
    async discoverFileStructure() {
        // Start with empty structure
        this.fileStructure = {
            '': {
                type: 'folder',
                children: {}
            }
        };
        
        // Build hardcoded structure
        await this.discoverActualFiles();
    }
    
    async discoverActualFiles() {
        // Hardcoded structure based on your ACTUAL data directory
        
        // Root level files (excluding recent_updates.json as per your exclusion list)
        this.addFileToStructure('', 'Data_Read_Me.MD', { size: 12000 });
        this.addFileToStructure('', 'end_of_season.json', { size: 25000 });
        this.addFileToStructure('', 'finalists.json', { size: 50000 });
        
        // Corps logos folder with all the actual logo files
        this.addFolderToStructure('', 'corps_logos');
        const logoFiles = [
            '27th.png', '27th_white.png', '7th.png', 'aca.png', 'ana.png', 'bac.png', 'bd.png',
            'bdb.png', 'bdc.png', 'bk.png', 'blk.png', 'blo-nofill.png', 'blo.png', 'blue_knights.png',
            'bs.png', 'bta-shadow.png', 'bta-white.png', 'bta.png', 'cad.png', 'cas.png', 'cav-drk.png',
            'cav.png', 'cc.png', 'clt.png', 'col.png', 'crw.png', 'dci-all-age.png', 'DCI-logo.svg',
            'dci-open.png', 'dci-world.png', 'dci.png', 'ge.png', 'gen.png', 'gld.png', 'gme.png',
            'gua.png', 'haw.png', 'hw.png', 'imp.png', 'ind.png', 'las.png', 'leg.png', 'les.png',
            'logo_dictionary.csv', 'mad.png', 'man-drk.png', 'man.png', 'mc.png', 'memb.png', 'oc.png',
            'orl.png', 'pac.png', 'pio.png', 'pr-nofill.png', 'pr.png', 'rai.png', 'rcr-drk.png',
            'rcr.png', 'rea-buc.png', 'scv.png', 'scvc.png', 'soa.png', 'spr.png', 'srf.png', 'sw.png',
            'tro-drk.png', 'tro.png', 'ves.png', 'xmn.png', 'yok-white.png', 'yok.png', 'zep.png',
            'zeu-white.png', 'zeu.png'
        ];
        logoFiles.forEach(file => {
            const size = file.endsWith('.csv') ? 15000 : (file.endsWith('.svg') ? 8000 : 5000);
            this.addFileToStructure('corps_logos', file, { size: size });
        });
        
        // Corps folder with JSON files - load from index
        this.addFolderToStructure('', 'corps');
        await this.loadCorpsFiles();
        
        // Shows folder
        this.addFolderToStructure('', 'shows');
        this.addFileToStructure('shows', 'master_shows_list.csv', { size: 800000 });
        
        // Years folder with all actual year files (note: no 2020 file)
        this.addFolderToStructure('', 'years');
        const years = [
            2009,2010,2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025
        ];
        years.forEach(year => {
            this.addFileToStructure('years', `${year}_dci_data.csv`, { size: 250000 });
        });
    }
    
    addFolderToStructure(parentPath, folderName) {
        const parentKey = parentPath || '';
        const folderKey = parentPath ? `${parentPath}/${folderName}` : folderName;
        
        // Ensure parent exists
        if (!this.fileStructure[parentKey]) {
            this.fileStructure[parentKey] = { type: 'folder', children: {} };
        }
        
        // Add folder to parent's children
        this.fileStructure[parentKey].children[folderName] = { type: 'folder', children: {} };
        
        // Create the folder entry itself
        if (!this.fileStructure[folderKey]) {
            this.fileStructure[folderKey] = { type: 'folder', children: {} };
        }
    }
    
    addFileToStructure(folderPath, filename, fileInfo = {}) {
        const pathKey = folderPath || '';
        if (!this.fileStructure[pathKey]) {
            this.fileStructure[pathKey] = { type: 'folder', children: {} };
        }
        
        this.fileStructure[pathKey].children[filename] = {
            type: 'file',
            size: fileInfo.size || 0
        };
    }
    
    async loadCorpsFiles() {
        try {
            const response = await fetch('../data/corps/index.json');
            if (response.ok) {
                const index = await response.json();
                if (index.files && Array.isArray(index.files)) {
                    index.files.forEach(filename => {
                        this.addFileToStructure('corps', filename, { size: 150000 });
                    });
                }
            } else {
                console.warn('Could not load corps index, using fallback');
                this.addFileToStructure('corps', 'index.json', { size: 5000 });
            }
        } catch (error) {
            console.warn('Error loading corps files:', error);
            this.addFileToStructure('corps', 'index.json', { size: 5000 });
        }
    }
    
    createFallbackStructure() {
        // Minimal fallback structure with only verified files
        this.fileStructure = {
            '': {
                type: 'folder',
                children: {
                    'Data_Read_Me.MD': { type: 'file', size: 0 }
                }
            }
        };
    }
    
    setupEventListeners() {
        // Navigation buttons
        document.getElementById('back-btn').addEventListener('click', () => this.goBack());
        document.getElementById('forward-btn').addEventListener('click', () => this.goForward());
        document.getElementById('up-btn').addEventListener('click', () => this.goUp());
        document.getElementById('home-btn').addEventListener('click', () => this.goHome());
        
        // Action buttons
        document.getElementById('download-all-btn').addEventListener('click', () => this.downloadAll());
        document.getElementById('refresh-btn').addEventListener('click', () => this.refresh());
        
        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setViewMode(e.target.dataset.view));
        });
        
        // Sort controls
        document.getElementById('sort-by').addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.refreshCurrentView();
        });
        
        document.getElementById('sort-order').addEventListener('click', () => this.toggleSortOrder());
        
        // Quick access
        document.querySelectorAll('.quick-access-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const path = e.currentTarget.dataset.path;
                this.navigateToPath(path);
            });
        });
        
        // File type filters
        document.querySelectorAll('.file-type-filter').forEach(filter => {
            filter.addEventListener('click', (e) => {
                this.setFileTypeFilter(e.currentTarget.dataset.type);
            });
        });
        
        // Breadcrumb navigation
        document.addEventListener('click', (e) => {
            if (e.target.closest('.breadcrumb-item')) {
                const path = e.target.closest('.breadcrumb-item').dataset.path;
                this.navigateToPath(path);
            }
        });
        
        // File grid interactions
        document.getElementById('file-grid').addEventListener('dblclick', (e) => {
            const fileItem = e.target.closest('.file-item');
            if (fileItem) {
                this.handleFileDoubleClick(fileItem);
            }
        });
        
        document.getElementById('file-grid').addEventListener('click', (e) => {
            const fileItem = e.target.closest('.file-item');
            if (fileItem) {
                this.handleFileClick(fileItem, e);
            }
        });
        
        // Context menu
        document.getElementById('file-grid').addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const fileItem = e.target.closest('.file-item');
            if (fileItem) {
                this.showContextMenu(e, fileItem);
            }
        });
        
        // Close context menu on click outside
        document.addEventListener('click', () => this.hideContextMenu());
    }
    
    navigateToPath(path) {
        this.currentPath = path;
        this.addToHistory(path);
        this.updateNavigationButtons();
        this.updateBreadcrumb();
        this.updateQuickAccess();
        this.refreshCurrentView();
    }
    
    addToHistory(path) {
        this.historyIndex++;
        this.navigationHistory = this.navigationHistory.slice(0, this.historyIndex);
        this.navigationHistory.push(path);
    }
    
    goBack() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.currentPath = this.navigationHistory[this.historyIndex];
            this.updateNavigationButtons();
            this.updateBreadcrumb();
            this.updateQuickAccess();
            this.refreshCurrentView();
        }
    }
    
    goForward() {
        if (this.historyIndex < this.navigationHistory.length - 1) {
            this.historyIndex++;
            this.currentPath = this.navigationHistory[this.historyIndex];
            this.updateNavigationButtons();
            this.updateBreadcrumb();
            this.updateQuickAccess();
            this.refreshCurrentView();
        }
    }
    
    goUp() {
        const pathParts = this.currentPath.split('/').filter(p => p);
        if (pathParts.length > 0) {
            pathParts.pop();
            this.navigateToPath(pathParts.join('/'));
        } else if (this.currentPath !== '') {
            this.navigateToPath('');
        }
    }
    
    goHome() {
        this.navigateToPath('');
    }
    
    updateNavigationButtons() {
        document.getElementById('back-btn').disabled = this.historyIndex <= 0;
        document.getElementById('forward-btn').disabled = this.historyIndex >= this.navigationHistory.length - 1;
        document.getElementById('up-btn').disabled = this.currentPath === '';
    }
    
    updateBreadcrumb() {
        const breadcrumb = document.querySelector('.explorer-breadcrumb');
        const pathParts = this.currentPath ? this.currentPath.split('/') : [];
        
        let html = '<span class="breadcrumb-item" data-path=""><i class="fas fa-database"></i> Data Root</span>';
        
        let currentPath = '';
        pathParts.forEach((part, index) => {
            currentPath += (index > 0 ? '/' : '') + part;
            html += `<span class="breadcrumb-item" data-path="${currentPath}"><i class="fas fa-folder"></i> ${part}</span>`;
        });
        
        breadcrumb.innerHTML = html;
        
        // Mark active breadcrumb
        breadcrumb.querySelectorAll('.breadcrumb-item').forEach(item => {
            item.classList.toggle('active', item.dataset.path === this.currentPath);
        });
    }
    
    updateQuickAccess() {
        document.querySelectorAll('.quick-access-item').forEach(item => {
            item.classList.toggle('active', item.dataset.path === this.currentPath);
        });
    }
    
    getCurrentFolder() {
        const pathKey = this.currentPath || '';
        return this.fileStructure[pathKey] || null;
    }
    
    navigateToPath(path) {
        this.currentPath = path;
        this.addToHistory(path);
        this.updateNavigationButtons();
        this.updateBreadcrumb();
        this.updateQuickAccess();
        
        // If we're navigating to a folder we haven't discovered yet, discover it
        const pathKey = path || '';
        if (!this.fileStructure[pathKey] && path !== '') {
            this.discoverDirectoryRecursive(path).then(() => {
                this.refreshCurrentView();
            });
        } else {
            this.refreshCurrentView();
        }
    }
    
    refreshCurrentView() {
        const folder = this.getCurrentFolder();
        if (!folder || folder.type !== 'folder') {
            this.showEmptyState('Folder not found');
            return;
        }
        
        let items = Object.entries(folder.children).map(([name, data]) => ({
            name,
            type: data.type,
            size: data.size || 0,
            extension: data.type === 'file' ? this.getFileExtension(name) : null
        }));
        
        // Apply file type filter
        if (this.fileTypeFilter) {
            items = items.filter(item => 
                item.type === 'folder' || 
                (item.extension && item.extension === this.fileTypeFilter)
            );
        }
        
        // Sort items
        items = this.sortItems(items);
        
        this.renderFileGrid(items);
        this.updateItemCount(items.length);
    }
    
    sortItems(items) {
        return items.sort((a, b) => {
            // Folders first
            if (a.type !== b.type) {
                return a.type === 'folder' ? -1 : 1;
            }
            
            let comparison = 0;
            switch (this.sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'type':
                    comparison = (a.extension || '').localeCompare(b.extension || '');
                    break;
                case 'size':
                    comparison = a.size - b.size;
                    break;
                default:
                    comparison = a.name.localeCompare(b.name);
            }
            
            return this.sortOrder === 'asc' ? comparison : -comparison;
        });
    }
    
    renderFileGrid(items) {
        const grid = document.getElementById('file-grid');
        grid.className = `file-grid ${this.viewMode}-view`;
        
        if (items.length === 0) {
            this.showEmptyState('No files found');
            return;
        }
        
        grid.innerHTML = items.map(item => this.createFileItemHTML(item)).join('');
    }
    
    createFileItemHTML(item) {
        const icon = this.getFileIcon(item);
        const sizeText = item.type === 'file' ? this.formatFileSize(item.size) : '';
        const cssClass = item.type === 'folder' ? 'folder' : item.extension?.substring(1) || 'file';
        
        if (this.viewMode === 'list') {
            return `
                <div class="file-item ${cssClass}" data-name="${item.name}" data-type="${item.type}">
                    <div class="file-icon">${icon}</div>
                    <div class="file-details">
                        <div class="file-name">${item.name}</div>
                        <div class="file-size">${sizeText}</div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="file-item ${cssClass}" data-name="${item.name}" data-type="${item.type}">
                    <div class="file-icon">${icon}</div>
                    <div class="file-name">${item.name}</div>
                    ${sizeText ? `<div class="file-size">${sizeText}</div>` : ''}
                </div>
            `;
        }
    }
    
    getFileIcon(item) {
        if (item.type === 'folder') {
            return '<i class="fas fa-folder"></i>';
        }
        
        switch (item.extension) {
            case '.csv': return '<i class="fas fa-file-csv"></i>';
            case '.json': return '<i class="fas fa-file-code"></i>';
            case '.txt': return '<i class="fas fa-file-alt"></i>';
            case '.md': case '.MD': return '<i class="fas fa-file-text"></i>';
            default: return '<i class="fas fa-file"></i>';
        }
    }
    
    getFileExtension(filename) {
        const parts = filename.split('.');
        return parts.length > 1 ? '.' + parts[parts.length - 1] : null;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    showEmptyState(message) {
        document.getElementById('file-grid').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <p>${message}</p>
            </div>
        `;
    }
    
    updateItemCount(count) {
        document.getElementById('item-count').textContent = `${count} item${count !== 1 ? 's' : ''}`;
        
        const selectionCount = document.getElementById('selection-count');
        if (this.selectedItems.size > 0) {
            selectionCount.textContent = `${this.selectedItems.size} selected`;
        } else {
            selectionCount.textContent = '';
        }
    }
    
    setViewMode(mode) {
        this.viewMode = mode;
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === mode);
        });
        this.refreshCurrentView();
    }
    
    setFileTypeFilter(type) {
        this.fileTypeFilter = type;
        document.querySelectorAll('.file-type-filter').forEach(filter => {
            filter.classList.toggle('active', filter.dataset.type === type);
        });
        this.refreshCurrentView();
    }
    
    toggleSortOrder() {
        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        const btn = document.getElementById('sort-order');
        btn.innerHTML = this.sortOrder === 'asc' ? 
            '<i class="fas fa-sort-alpha-down"></i>' : 
            '<i class="fas fa-sort-alpha-up"></i>';
        this.refreshCurrentView();
    }
    
    handleFileClick(fileItem, event) {
        const name = fileItem.dataset.name;
        
        if (event.ctrlKey || event.metaKey) {
            // Multi-select
            if (this.selectedItems.has(name)) {
                this.selectedItems.delete(name);
                fileItem.classList.remove('selected');
            } else {
                this.selectedItems.add(name);
                fileItem.classList.add('selected');
            }
        } else {
            // Single select
            document.querySelectorAll('.file-item.selected').forEach(item => {
                item.classList.remove('selected');
            });
            this.selectedItems.clear();
            this.selectedItems.add(name);
            fileItem.classList.add('selected');
        }
        
        this.updateItemCount(document.querySelectorAll('.file-item').length);
    }
    
    handleFileDoubleClick(fileItem) {
        const name = fileItem.dataset.name;
        const type = fileItem.dataset.type;
        
        if (type === 'folder') {
            const newPath = this.currentPath ? `${this.currentPath}/${name}` : name;
            this.navigateToPath(newPath);
        } else {
            this.downloadFile(name);
        }
    }
    
    downloadFile(filename) {
        const filePath = this.getFilePath(filename);
        const link = document.createElement('a');
        link.href = filePath;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    getFilePath(filename) {
        if (this.currentPath === '') {
            return `../data/${filename}`;
        } else {
            return `../data/${this.currentPath}/${filename}`;
        }
    }
    
    downloadAll() {
        const folder = this.getCurrentFolder();
        if (!folder) return;
        
        const files = Object.entries(folder.children)
            .filter(([name, data]) => data.type === 'file')
            .map(([name]) => name);
        
        if (files.length === 0) {
            alert('No files to download in current folder');
            return;
        }
        
        files.forEach((filename, index) => {
            setTimeout(() => {
                this.downloadFile(filename);
            }, index * 100); // Small delay between downloads
        });
    }
    
    refresh() {
        this.refreshCurrentView();
    }
    
    showContextMenu(event, fileItem) {
        this.hideContextMenu();
        
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = `
            <div class="context-menu-item" data-action="download">
                <i class="fas fa-download"></i> Download
            </div>
            <div class="context-menu-item" data-action="copy-name">
                <i class="fas fa-copy"></i> Copy Name
            </div>
        `;
        
        menu.style.left = event.pageX + 'px';
        menu.style.top = event.pageY + 'px';
        
        menu.addEventListener('click', (e) => {
            const action = e.target.closest('.context-menu-item')?.dataset.action;
            const filename = fileItem.dataset.name;
            
            switch (action) {
                case 'download':
                    this.downloadFile(filename);
                    break;
                case 'copy-name':
                    navigator.clipboard.writeText(filename);
                    break;
            }
            
            this.hideContextMenu();
        });
        
        document.body.appendChild(menu);
        this.contextMenu = menu;
    }
    
    hideContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.remove();
            this.contextMenu = null;
        }
    }
    
    updateUI() {
        this.updateNavigationButtons();
        this.updateBreadcrumb();
        this.updateQuickAccess();
    }
}

// Initialize file explorer when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new FileExplorer();
});
