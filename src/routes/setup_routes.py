from flask import Blueprint, jsonify
from datetime import date
from src.models.tronos_models import db, TronosUser

setup_bp = Blueprint('setup', __name__)

@setup_bp.route('/create-admin', methods=['GET', 'POST'])
def create_admin_endpoint():
    """Endpoint para criar admin em produção"""
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

@setup_bp.route('/create-test-user', methods=['GET', 'POST'])
def create_test_user_endpoint():
    """Endpoint para criar usuário de teste em produção"""
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

@setup_bp.route('/check-users', methods=['GET'])
def check_users():
    """Endpoint para verificar usuários existentes"""
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

