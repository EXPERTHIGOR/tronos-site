import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Carregar variáveis de ambiente do arquivo .env
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

from flask import Flask, send_from_directory
from src.models.tronos_models import db, TronosUser, RemovalRequest, ContactMessage, SystemLog
from src.routes.tronos_routes import tronos_bp
from src.routes.setup_routes import setup_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'tronos_secret_key_2024_futuristic_dark'

app.register_blueprint(tronos_bp, url_prefix='/api')
app.register_blueprint(setup_bp, url_prefix='/setup')

# Database configuration for Supabase PostgreSQL
database_url = os.environ.get('DATABASE_URL')
if not database_url:
    # Fallback para desenvolvimento local
    database_url = f"sqlite:///{os.path.join('/tmp', 'app.db')}?timeout=20"

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Configurações específicas para PostgreSQL
if database_url.startswith('postgresql'):
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_size': 10,
        'pool_timeout': 30,
        'pool_recycle': 3600,
        'pool_pre_ping': True,
        'connect_args': {
            'sslmode': 'require',
            'connect_timeout': 30
        }
    }
else:
    # Configurações para SQLite (desenvolvimento)
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_timeout': 20,
        'pool_recycle': -1,
        'pool_pre_ping': True
    }

try:
    db.init_app(app)
    with app.app_context():
        db.create_all()
except Exception as e:
    print(f"Database initialization error: {e}")

# Rotas de setup para criar usuários em produção
@app.route('/setup/create-admin', methods=['GET', 'POST'])
def create_admin_endpoint():
    """Endpoint para criar admin em produção"""
    from flask import jsonify
    from datetime import date
    try:
        # Verificar se já existe admin
        admin = TronosUser.query.filter_by(user_type='admin').first()
        if admin:
            return jsonify({'message': f'Admin já existe: {admin.email}'}), 200
        
        # Criar usuário admin
        admin = TronosUser(
            login='admin',
            email='admin@tronos.com',
            full_name='Administrador',
            user_type='admin',
            birth_date=date(1990, 1, 1),
            whatsapp='11999999999',
            is_approved=True
        )
        admin.set_password('admin123')
        
        db.session.add(admin)
        db.session.commit()
        
        return jsonify({
            'message': 'Admin criado com sucesso!',
            'email': 'admin@tronos.com',
            'password': 'admin123'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/setup/create-test-user', methods=['GET', 'POST'])
def create_test_user_endpoint():
    """Endpoint para criar usuário de teste em produção"""
    from flask import jsonify
    from datetime import date
    try:
        # Verificar se já existe usuário de teste
        test_user = TronosUser.query.filter_by(email='agente@teste.com').first()
        if test_user:
            return jsonify({'message': f'Usuário de teste já existe: {test_user.email}'}), 200
        
        # Criar usuário de teste
        test_user = TronosUser(
            login='agente_teste',
            email='agente@teste.com',
            full_name='Agente de Teste',
            user_type='agent',
            birth_date=date(1995, 5, 15),
            whatsapp='11888888888',
            channel_name='Canal de Teste',
            function='Editor principal',
            is_approved=True
        )
        test_user.set_password('teste123')
        
        db.session.add(test_user)
        db.session.commit()
        
        return jsonify({
            'message': 'Usuário de teste criado com sucesso!',
            'email': 'agente@teste.com',
            'password': 'teste123'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/setup/check-users', methods=['GET'])
def check_users():
    """Endpoint para verificar usuários existentes"""
    from flask import jsonify
    try:
        users = TronosUser.query.all()
        users_data = []
        
        for user in users:
            users_data.append({
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name,
                'user_type': user.user_type,
                'is_approved': user.is_approved,
                'created_at': user.created_at.isoformat()
            })
        
        return jsonify({
            'total_users': len(users),
            'users': users_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    # Não capturar rotas de API e setup
    if path.startswith('api/') or path.startswith('setup/'):
        from flask import abort
        abort(404)
    
    static_folder_path = app.static_folder
    if static_folder_path is None:
            return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)
