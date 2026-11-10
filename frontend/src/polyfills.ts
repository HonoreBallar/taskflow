// sockjs-client référence la variable Node `global` : on l'aliase sur window dans le navigateur.
(window as unknown as { global: Window }).global = window;
