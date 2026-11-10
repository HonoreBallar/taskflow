package com.taskflow.users;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    long countByRole(Role role);

    /**
     * Recherche limitée aux utilisateurs qui partagent au moins un workspace avec le demandeur
     * (tous pour un administrateur) : l'annuaire complet n'est pas exposé à n'importe quel inscrit.
     */
    @Query("""
            select u from User u
            where (lower(u.firstname) like lower(concat('%', :q, '%'))
                or lower(u.lastname) like lower(concat('%', :q, '%'))
                or lower(u.email) like lower(concat('%', :q, '%')))
              and (:admin = true or u.id = :userId or exists (
                    select w.id from Workspace w
                    where (w.owner.id = :userId or exists (select m1.id from w.members m1 where m1.id = :userId))
                      and (w.owner.id = u.id or exists (select m2.id from w.members m2 where m2.id = u.id))))
            order by u.firstname
            """)
    List<User> search(@Param("q") String q, @Param("userId") Long userId, @Param("admin") boolean admin);
}
