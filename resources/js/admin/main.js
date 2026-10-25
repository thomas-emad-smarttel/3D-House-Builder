import '../../css/admin.css';
import { Editor } from './Editor.js';

const root = document.getElementById('admin-app');
if (root) new Editor(root).init();
