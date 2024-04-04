"""add_gt_stats

Revision ID: a0c5c3a4c13f
Revises: ca93dce1a618
Create Date: 2024-03-08 11:34:02.458845

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a0c5c3a4c13f'
down_revision = 'ca93dce1a618'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('gt_stats',
    sa.Column('task_id', sa.String(), nullable=False),
    sa.Column('gt_key', sa.String(), nullable=False),
    sa.Column('failed_attempts', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('task_id', 'gt_key')
    )
    op.create_index(op.f('ix_gt_stats_gt_key'), 'gt_stats', ['gt_key'], unique=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f('ix_gt_stats_gt_key'), table_name='gt_stats')
    op.drop_table('gt_stats')
    # ### end Alembic commands ###
